import {
  baseTransform,
  type AudioItem,
  type Background,
  type CaptionStyle,
  type CaptionWord,
  type Clip,
  type Keyframe,
  type Mix,
  type OverlayLayer,
  type Overlays,
  type Project,
  type RatioId,
  type SfxName,
  type SpeedCurve,
  type TextLayer,
  type Transform,
} from "./types";

const MIN_CLIP = 0.2;

// ---- speed curves ----

/** Source seconds per timeline second, as a multiple of the base speed, at source progress p (0..1). */
function curveRate(curve: SpeedCurve, p: number): number {
  switch (curve) {
    case "rampUp":
      return 0.5 + 1.5 * p;
    case "rampDown":
      return 2 - 1.5 * p;
    case "pulse":
      return 0.5 + 1.5 * Math.sin(Math.PI * p);
    case "hero":
      return 2 - 1.5 * Math.sin(Math.PI * p);
    default:
      return 1;
  }
}

const STEPS = 200;
const tables = new Map<SpeedCurve, number[]>();

/** Cumulative timeline time (in units of length/speed) to reach each step of source progress. */
function curveTable(curve: SpeedCurve): number[] {
  let table = tables.get(curve);
  if (!table) {
    table = [0];
    for (let i = 1; i <= STEPS; i++) {
      const p = (i - 0.5) / STEPS;
      table.push(table[i - 1] + 1 / STEPS / curveRate(curve, p));
    }
    tables.set(curve, table);
  }
  return table;
}

const isFrozen = (c: Clip) => c.freeze !== undefined;

export function clipDuration(c: Clip): number {
  if (isFrozen(c)) return Math.max(MIN_CLIP, c.out - c.in);
  const length = c.out - c.in;
  const total = curve(c) === "none" ? 1 : curveTable(c.curve)[STEPS];
  return Math.max(MIN_CLIP, (length / c.speed) * total);
}

const curve = (c: Clip): SpeedCurve => c.curve ?? "none";

/** Source progress (0..1) after `local` seconds on the timeline. */
function progressAt(c: Clip, local: number): number {
  const length = Math.max(c.out - c.in, 0.001);
  if (curve(c) === "none") return Math.min(Math.max((local * c.speed) / length, 0), 1);
  const table = curveTable(c.curve);
  const target = Math.min(Math.max((local * c.speed) / length, 0), table[STEPS]);
  let lo = 0;
  let hi = STEPS;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid] <= target) lo = mid;
    else hi = mid;
  }
  const span = table[hi] - table[lo] || 1;
  return (lo + (target - table[lo]) / span) / STEPS;
}

/** The moment in the source file that shows at `local` seconds into the clip. */
export function sourceTimeAt(c: Clip, local: number): number {
  if (c.freeze !== undefined) return c.freeze;
  const p = progressAt(c, local);
  const length = c.out - c.in;
  return c.reverse ? c.out - p * length : c.in + p * length;
}

/** How fast the source file should play at `local` seconds into the clip. */
export function playbackRateAt(c: Clip, local: number): number {
  if (curve(c) === "none") return c.speed;
  return c.speed * curveRate(c.curve, progressAt(c, local));
}

// ---- keyframes ----

const ease = (u: number) => u * u * (3 - 2 * u);

export function evalTransform(base: Transform, keys: Keyframe[], local: number): Transform {
  if (!keys.length) return base;
  const out: Transform = { ...base };
  (Object.keys(baseTransform) as (keyof Transform)[]).forEach((prop) => {
    const pts = keys.filter((k) => k.values[prop] !== undefined).sort((a, b) => a.t - b.t);
    if (!pts.length) return;
    if (local <= pts[0].t) out[prop] = pts[0].values[prop] as number;
    else if (local >= pts[pts.length - 1].t) out[prop] = pts[pts.length - 1].values[prop] as number;
    else {
      const i = pts.findIndex((k) => k.t > local);
      const a = pts[i - 1];
      const b = pts[i];
      const u = ease((local - a.t) / (b.t - a.t || 1));
      const av = a.values[prop] as number;
      const bv = b.values[prop] as number;
      out[prop] = av + (bv - av) * u;
    }
  });
  return out;
}

// ---- layout ----

export interface LaidOutClip {
  clip: Clip;
  start: number;
  end: number;
}

/** Clips play one after another, so their positions follow from their order. */
export function layout(clips: Clip[]): LaidOutClip[] {
  let t = 0;
  return clips.map((clip) => {
    const start = t;
    t += clipDuration(clip);
    return { clip, start, end: t };
  });
}

export const totalDuration = (clips: Clip[]) => clips.reduce((sum, c) => sum + clipDuration(c), 0);

/** The clip playing at timeline time t, and where that falls inside its source. */
export function locate(
  items: LaidOutClip[],
  t: number,
): { item: LaidOutClip; local: number; sourceTime: number; index: number } | null {
  if (!items.length) return null;
  let index = items.findIndex((i) => t >= i.start && t < i.end);
  if (index < 0) index = items.length - 1;
  const hit = items[index];
  const local = Math.min(Math.max(t - hit.start, 0), hit.end - hit.start);
  return { item: hit, local, sourceTime: sourceTimeAt(hit.clip, local), index };
}

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

// ---- reducer ----

export type Action =
  | { type: "addClip"; clip: Clip }
  | { type: "updateClip"; id: string; patch: Partial<Omit<Clip, "id" | "sourceId">> }
  | { type: "deleteClip"; id: string }
  | { type: "moveClip"; id: string; direction: -1 | 1 }
  | { type: "split"; t: number }
  | { type: "freeze"; t: number; duration: number }
  | { type: "addText"; text: TextLayer }
  | { type: "updateText"; id: string; patch: Partial<Omit<TextLayer, "id">> }
  | { type: "deleteText"; id: string }
  | { type: "addLayer"; layer: OverlayLayer }
  | { type: "updateLayer"; id: string; patch: Partial<Omit<OverlayLayer, "id">> }
  | { type: "deleteLayer"; id: string }
  | { type: "addAudio"; item: AudioItem }
  | { type: "updateAudio"; id: string; patch: Partial<Omit<AudioItem, "id">> }
  | { type: "deleteAudio"; id: string }
  | { type: "setCaptions"; words: CaptionWord[] }
  | { type: "setCaptionStyle"; style: CaptionStyle }
  | { type: "setCaptionSfx"; sfx: SfxName | "none" }
  | { type: "setTransitionSfx"; sfx: SfxName | "none" }
  | { type: "setBeats"; beats: number[] }
  | { type: "setBackground"; background: Background }
  | { type: "setMix"; mix: Mix }
  | { type: "setRatio"; ratio: RatioId }
  | { type: "setOverlays"; overlays: Overlays };

/** Splits one clip in two at timeline time `t`. Returns null when the point is too close to an edge. */
function splitClip(clips: Clip[], t: number): { clips: Clip[]; at: number } | null {
  const hit = layout(clips).find((i) => t > i.start + MIN_CLIP && t < i.end - MIN_CLIP);
  if (!hit || isFrozen(hit.clip)) return null;
  const c = hit.clip;
  const local = t - hit.start;
  const at = sourceTimeAt(c, local);
  const plain: Partial<Clip> = curve(c) === "none" ? {} : { curve: "none" };
  const first: Clip = {
    ...c,
    ...plain,
    ...(c.reverse ? { in: at } : { out: at }),
    keys: c.keys.filter((k) => k.t < local),
  };
  const second: Clip = {
    ...c,
    ...plain,
    id: newId("clip"),
    ...(c.reverse ? { out: at } : { in: at }),
    keys: c.keys.filter((k) => k.t >= local).map((k) => ({ ...k, t: k.t - local })),
    transition: { type: "none", duration: c.transition.duration },
  };
  return { clips: clips.flatMap((x) => (x.id === c.id ? [first, second] : [x])), at };
}

export function reduceProject(p: Project, a: Action): Project {
  switch (a.type) {
    case "addClip":
      return { ...p, clips: [...p.clips, a.clip] };
    case "updateClip":
      return {
        ...p,
        clips: p.clips.map((c) => {
          if (c.id !== a.id) return c;
          const next = { ...c, ...a.patch };
          next.in = Math.max(0, next.in);
          if (!isFrozen(next) && next.out - next.in < MIN_CLIP) {
            if (a.patch.in !== undefined) next.in = next.out - MIN_CLIP;
            else next.out = next.in + MIN_CLIP;
          }
          return next;
        }),
      };
    case "deleteClip":
      return { ...p, clips: p.clips.filter((c) => c.id !== a.id) };
    case "moveClip": {
      const i = p.clips.findIndex((c) => c.id === a.id);
      const j = i + a.direction;
      if (i < 0 || j < 0 || j >= p.clips.length) return p;
      const clips = [...p.clips];
      [clips[i], clips[j]] = [clips[j], clips[i]];
      return { ...p, clips };
    }
    case "split": {
      const res = splitClip(p.clips, a.t);
      return res ? { ...p, clips: res.clips } : p;
    }
    case "freeze": {
      const items = layout(p.clips);
      const hit = items.find((i) => a.t >= i.start && a.t < i.end) ?? items[items.length - 1];
      if (!hit || isFrozen(hit.clip)) return p;
      const src = sourceTimeAt(hit.clip, Math.min(Math.max(a.t - hit.start, 0), hit.end - hit.start));
      const still: Clip = {
        ...hit.clip,
        id: newId("clip"),
        freeze: src,
        in: src,
        out: src + a.duration,
        speed: 1,
        curve: "none",
        reverse: false,
        volume: 0,
        keys: [],
        transition: { type: "none", duration: hit.clip.transition.duration },
        stabilize: false,
      };
      let clips = p.clips;
      const local = a.t - hit.start;
      let insertAfter = hit.clip.id;
      if (local <= MIN_CLIP) {
        const idx = clips.findIndex((c) => c.id === hit.clip.id);
        clips = [...clips.slice(0, idx), still, ...clips.slice(idx)];
        return { ...p, clips };
      }
      if (hit.end - a.t > MIN_CLIP) {
        const res = splitClip(clips, a.t);
        if (res) {
          clips = res.clips;
          insertAfter = hit.clip.id;
        }
      }
      const idx = clips.findIndex((c) => c.id === insertAfter);
      return { ...p, clips: [...clips.slice(0, idx + 1), still, ...clips.slice(idx + 1)] };
    }
    case "addText":
      return { ...p, texts: [...p.texts, a.text] };
    case "updateText":
      return { ...p, texts: p.texts.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) };
    case "deleteText":
      return { ...p, texts: p.texts.filter((t) => t.id !== a.id) };
    case "addLayer":
      return { ...p, layers: [...p.layers, a.layer] };
    case "updateLayer":
      return { ...p, layers: p.layers.map((l) => (l.id === a.id ? { ...l, ...a.patch } : l)) };
    case "deleteLayer":
      return { ...p, layers: p.layers.filter((l) => l.id !== a.id) };
    case "addAudio":
      return { ...p, audio: [...p.audio, a.item] };
    case "updateAudio":
      return { ...p, audio: p.audio.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) };
    case "deleteAudio":
      return { ...p, audio: p.audio.filter((x) => x.id !== a.id) };
    case "setCaptions":
      return { ...p, captions: a.words };
    case "setCaptionStyle":
      return { ...p, captionStyle: a.style };
    case "setCaptionSfx":
      return { ...p, captionSfx: a.sfx };
    case "setTransitionSfx":
      return { ...p, transitionSfx: a.sfx };
    case "setBeats":
      return { ...p, beats: a.beats };
    case "setBackground":
      return { ...p, background: a.background };
    case "setMix":
      return { ...p, mix: a.mix };
    case "setRatio":
      return { ...p, ratio: a.ratio };
    case "setOverlays":
      return { ...p, overlays: a.overlays };
  }
}

export interface History {
  past: Project[];
  present: Project;
  future: Project[];
  /** Key of the last edit, so a slider drag becomes one undo step. */
  last: string | null;
}

export type HistoryAction = Action | { type: "undo" } | { type: "redo" };

const LIMIT = 100;

export const emptyHistory = (present: Project): History => ({ past: [], present, future: [], last: null });

function mergeKey(a: Action): string | null {
  if (a.type === "updateClip" || a.type === "updateText" || a.type === "updateLayer" || a.type === "updateAudio") {
    return `${a.type}:${a.id}:${Object.keys(a.patch).sort().join(",")}`;
  }
  if (a.type === "setOverlays" || a.type === "setMix" || a.type === "setBackground") return a.type;
  return null;
}

export function reduceHistory(h: History, a: HistoryAction): History {
  if (a.type === "undo") {
    const prev = h.past[h.past.length - 1];
    return prev ? { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], last: null } : h;
  }
  if (a.type === "redo") {
    const next = h.future[0];
    return next ? { past: [...h.past, h.present], present: next, future: h.future.slice(1), last: null } : h;
  }
  const present = reduceProject(h.present, a);
  if (present === h.present) return h;
  const key = mergeKey(a);
  if (key && key === h.last) return { ...h, present, future: [] };
  return { past: [...h.past, h.present].slice(-LIMIT), present, future: [], last: key };
}
