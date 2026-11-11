/**
 * The Edit Decision List (EDL) for the automated Reel editor.
 *
 * TIME RULE: every time in this file is in seconds of the ORIGINAL uploaded video.
 * The renderer converts to the trimmed timeline with `toOutputTime`, so captions, B-roll
 * and sound effects never drift after a cut.
 */

export type DisplayMode = "FULLSCREEN_BROLL" | "PIP_TALKING_HEAD" | "SPLIT_SCREEN";
export type BrollAnimation = "ZOOM_IN_SLOW" | "PAN_LEFT" | "POP_IN" | "CROSS_DISSOLVE";
export type AssetType = "image" | "video";

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface Span {
  start: number;
  end: number;
}

export interface Cut {
  keep_start: number;
  keep_end: number;
}

export interface Caption {
  text: string;
  start: number;
  end: number;
  highlight_words: string[];
}

export interface BRoll {
  start: number;
  end: number;
  search_term: string;
  asset_type: AssetType;
  display_mode: DisplayMode;
  animation: BrollAnimation;
  pip_speaker_overlay: boolean;
  pip_text_badge?: string;
  /** Set when the subject is a real person or club: the editor asks you for your own picture. */
  needs_own_asset?: boolean;
}

export interface AudioFx {
  time: number;
  effect: "whoosh" | "pop" | "impact" | "click" | "ding";
}

export interface Edl {
  cuts: Cut[];
  captions: Caption[];
  b_roll: BRoll[];
  audio_fx: AudioFx[];
}

export const emptyEdl: Edl = { cuts: [], captions: [], b_roll: [], audio_fx: [] };

const DISPLAY_MODES: DisplayMode[] = ["FULLSCREEN_BROLL", "PIP_TALKING_HEAD", "SPLIT_SCREEN"];
const ANIMATIONS: BrollAnimation[] = ["ZOOM_IN_SLOW", "PAN_LEFT", "POP_IN", "CROSS_DISSOLVE"];
const EFFECTS: AudioFx["effect"][] = ["whoosh", "pop", "impact", "click", "ding"];

/** Total length of the video once the cuts are applied. */
export function outputDuration(cuts: Cut[]): number {
  return cuts.reduce((sum, c) => sum + (c.keep_end - c.keep_start), 0);
}

/** Where a moment of the original video lands in the trimmed video, or null if it was cut out. */
export function toOutputTime(cuts: Cut[], t: number): number | null {
  let elapsed = 0;
  for (const c of cuts) {
    if (t >= c.keep_start && t <= c.keep_end) return elapsed + (t - c.keep_start);
    elapsed += c.keep_end - c.keep_start;
  }
  return null;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const pick = <T extends string>(v: unknown, allowed: T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

export interface ParsedEdl {
  edl: Edl;
  /** Things that were wrong or dropped. Shown to you instead of failing silently. */
  problems: string[];
}

/**
 * Cleans an EDL that came back from an AI model. Bad items are dropped and reported,
 * times are kept inside the video, and everything is sorted.
 */
export function parseEdl(raw: unknown, duration: number): ParsedEdl {
  const problems: string[] = [];
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (key: string): unknown[] => (Array.isArray(obj[key]) ? (obj[key] as unknown[]) : []);
  const within = (t: number) => Math.min(Math.max(t, 0), duration);

  const cuts: Cut[] = [];
  for (const item of list("cuts")) {
    const c = item as Record<string, unknown>;
    const a = num(c?.keep_start);
    const b = num(c?.keep_end);
    if (a === null || b === null || b - a < 0.05) {
      problems.push("Dropped a cut with bad times.");
      continue;
    }
    cuts.push({ keep_start: within(a), keep_end: within(b) });
  }
  cuts.sort((x, y) => x.keep_start - y.keep_start);

  const captions: Caption[] = [];
  for (const item of list("captions")) {
    const c = item as Record<string, unknown>;
    const a = num(c?.start);
    const b = num(c?.end);
    const text = str(c?.text);
    if (a === null || b === null || b <= a || !text) {
      problems.push("Dropped a caption with bad times or no text.");
      continue;
    }
    const highlight_words = Array.isArray(c.highlight_words) ? c.highlight_words.map(str).filter(Boolean) : [];
    captions.push({ text: text.toUpperCase(), start: within(a), end: within(b), highlight_words });
  }
  captions.sort((x, y) => x.start - y.start);

  const b_roll: BRoll[] = [];
  for (const item of list("b_roll")) {
    const c = item as Record<string, unknown>;
    const a = num(c?.start);
    const b = num(c?.end);
    const search_term = str(c?.search_term);
    if (a === null || b === null || b - a < 0.4 || !search_term) {
      problems.push("Dropped a B-roll slot with bad times or no search term.");
      continue;
    }
    const display_mode = pick(c.display_mode, DISPLAY_MODES, "FULLSCREEN_BROLL");
    const badge = str(c.pip_text_badge);
    b_roll.push({
      start: within(a),
      end: within(b),
      search_term,
      asset_type: c.asset_type === "image" ? "image" : "video",
      display_mode,
      animation: pick(c.animation, ANIMATIONS, "ZOOM_IN_SLOW"),
      pip_speaker_overlay: display_mode === "PIP_TALKING_HEAD" || c.pip_speaker_overlay === true,
      ...(badge ? { pip_text_badge: badge.toUpperCase() } : {}),
      ...(c.needs_own_asset === true ? { needs_own_asset: true } : {}),
    });
  }
  b_roll.sort((x, y) => x.start - y.start);

  const audio_fx: AudioFx[] = [];
  for (const item of list("audio_fx")) {
    const c = item as Record<string, unknown>;
    const t = num(c?.time);
    const name = str(c?.effect).replace(/\.(wav|mp3)$/i, "") as AudioFx["effect"];
    if (t === null || !EFFECTS.includes(name)) {
      problems.push("Dropped a sound effect it did not recognise.");
      continue;
    }
    audio_fx.push({ time: within(t), effect: name });
  }
  audio_fx.sort((x, y) => x.time - y.time);

  return { edl: { cuts, captions, b_roll, audio_fx }, problems };
}
