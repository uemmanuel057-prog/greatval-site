import type { Cut } from "@/lib/reel/edl";
import { filterPresets, neutralAdjust, type CaptionStyle, type Clip, type Project, type SfxName, type TransitionType } from "./types";

/**
 * One-tap Reel styles. A style sets the whole look at once: captions, colour, transitions,
 * the sound on each cut, and the "punch-in" zoom that keeps talking-head videos moving.
 */
export interface ReelStyle {
  id: string;
  name: string;
  /** One line shown under the name. */
  vibe: string;
  /** Two colours for the preview card. */
  swatch: [string, string];
  /** Colour of the sample word on the card. */
  ink: string;
  caption: CaptionStyle;
  captionSfx: SfxName | "none";
  filter: string;
  transition: TransitionType;
  transitionDuration: number;
  transitionSfx: SfxName | "none";
  /** Zoom in a little on every other clip, the classic talking-head jump-cut look. */
  punchIn: boolean;
}

/** How far a punch-in zooms. Kept exact so clearing a style can find and undo it. */
export const PUNCH_ZOOM = 1.14;

export const reelStyles: ReelStyle[] = [
  {
    id: "great-val",
    name: "GREAT VAL",
    vibe: "Gold captions, warm look, zoom cuts",
    swatch: ["#2a1c05", "#0B0F17"],
    ink: "#E8A93A",
    caption: "gold",
    captionSfx: "none",
    filter: "gold",
    transition: "zoom",
    transitionDuration: 0.4,
    transitionSfx: "whoosh",
    punchIn: true,
  },
  {
    id: "hype",
    name: "Hype",
    vibe: "Pop-in words, punchy colour, flash cuts",
    swatch: ["#3b0a0a", "#111827"],
    ink: "#FFFFFF",
    caption: "pop",
    captionSfx: "none",
    filter: "vivid",
    transition: "flash",
    transitionDuration: 0.3,
    transitionSfx: "hit",
    punchIn: true,
  },
  {
    id: "clean",
    name: "Clean talk",
    vibe: "Karaoke captions, natural colour, soft fades",
    swatch: ["#1f2937", "#0f172a"],
    ink: "#E8A93A",
    caption: "karaoke",
    captionSfx: "none",
    filter: "none",
    transition: "fade",
    transitionDuration: 0.5,
    transitionSfx: "none",
    punchIn: false,
  },
  {
    id: "podcast",
    name: "Podcast",
    vibe: "Boxed captions, warm tone, jump zooms",
    swatch: ["#3a2412", "#14100c"],
    ink: "#0B0F17",
    caption: "box",
    captionSfx: "none",
    filter: "warm",
    transition: "none",
    transitionDuration: 0.4,
    transitionSfx: "none",
    punchIn: true,
  },
  {
    id: "cinematic",
    name: "Cinematic",
    vibe: "Serif captions, film colour, slow fades",
    swatch: ["#10202a", "#050608"],
    ink: "#F8FAFC",
    caption: "serif",
    captionSfx: "none",
    filter: "cinema",
    transition: "fade",
    transitionDuration: 0.8,
    transitionSfx: "none",
    punchIn: false,
  },
  {
    id: "neon",
    name: "Neon night",
    vibe: "Glowing captions, cool tone, rise cuts",
    swatch: ["#04252e", "#0a0a1a"],
    ink: "#67E8F9",
    caption: "neon",
    captionSfx: "none",
    filter: "cool",
    transition: "slideUp",
    transitionDuration: 0.4,
    transitionSfx: "glitch",
    punchIn: false,
  },
];

export function applyStyle(p: Project, s: ReelStyle): Project {
  const preset = filterPresets.find((f) => f.id === s.filter);
  let zoomed = false;
  const clips = p.clips.map((c, i) => {
    const next: Clip = {
      ...c,
      filter: s.filter,
      adjust: { ...neutralAdjust, ...(preset?.adjust ?? {}) },
      transition: { type: i > 0 && !c.joined ? s.transition : "none", duration: s.transitionDuration },
    };
    if (s.punchIn) {
      if (i > 0) zoomed = !zoomed;
      next.crop = { ...c.crop, zoom: zoomed ? PUNCH_ZOOM : 1 };
    } else if (c.crop.zoom === PUNCH_ZOOM) {
      next.crop = { ...c.crop, zoom: 1 };
    }
    return next;
  });
  return {
    ...p,
    clips,
    captionStyle: s.caption,
    captionSfx: s.captionSfx,
    transitionSfx: s.transition === "none" ? "none" : s.transitionSfx,
    styleId: s.id,
  };
}

/** Puts the look back to plain: original colour, no transitions, no punch-ins. Your cuts and captions stay. */
export function clearStyle(p: Project): Project {
  return {
    ...p,
    clips: p.clips.map((c) => ({
      ...c,
      filter: "none",
      adjust: neutralAdjust,
      transition: { type: "none", duration: c.transition.duration },
      crop: c.crop.zoom === PUNCH_ZOOM ? { ...c.crop, zoom: 1 } : c.crop,
    })),
    transitionSfx: "none",
    captionSfx: "none",
    styleId: null,
  };
}

export interface PauseCutResult {
  clips: Clip[];
  /** Seconds taken out of the video. */
  saved: number;
  /** Number of pauses removed. */
  removed: number;
  /** Clips left alone because they are frozen, reversed, curved or keyframed. */
  skipped: number;
}

const MIN_PIECE = 0.25;

/**
 * Splits clips around their pauses. `keepFor` gives the speech parts of a source, in source time.
 * The first piece keeps the clip's id and transition; the rest join it with a hard cut.
 */
export function cutPauses(clips: Clip[], keepFor: (sourceId: string) => Cut[] | null, makeId: () => string): PauseCutResult {
  let saved = 0;
  let removed = 0;
  let skipped = 0;
  const out: Clip[] = [];
  for (const c of clips) {
    const cuts = keepFor(c.sourceId);
    if (!cuts || c.freeze !== undefined || c.reverse || c.curve !== "none" || c.keys.length > 0) {
      if (cuts) skipped++;
      out.push(c);
      continue;
    }
    const pieces: [number, number][] = [];
    for (const k of cuts) {
      const a = Math.max(k.keep_start, c.in);
      const b = Math.min(k.keep_end, c.out);
      if (b - a >= MIN_PIECE) pieces.push([a, b]);
    }
    if (!pieces.length) {
      out.push(c);
      continue;
    }
    const kept = pieces.reduce((sum, [a, b]) => sum + (b - a), 0);
    saved += (c.out - c.in - kept) / c.speed;
    const gaps = pieces.length - 1 + (pieces[0][0] > c.in + 0.05 ? 1 : 0) + (pieces[pieces.length - 1][1] < c.out - 0.05 ? 1 : 0);
    removed += gaps;
    pieces.forEach(([a, b], i) => {
      out.push(
        i === 0
          ? { ...c, in: a, out: b }
          : { ...c, id: makeId(), in: a, out: b, joined: true, transition: { type: "none", duration: c.transition.duration } },
      );
    });
  }
  return { clips: out, saved, removed, skipped };
}
