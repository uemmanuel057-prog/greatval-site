import type { Clip, Overlays, Project, RatioId, TextLayer } from "./types";

const MIN_CLIP = 0.2;

export const clipDuration = (c: Clip) => Math.max(MIN_CLIP, (c.out - c.in) / c.speed);

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
export function locate(items: LaidOutClip[], t: number): { item: LaidOutClip; sourceTime: number } | null {
  if (!items.length) return null;
  const hit = items.find((i) => t >= i.start && t < i.end) ?? items[items.length - 1];
  const local = Math.min(Math.max(t - hit.start, 0), hit.end - hit.start);
  return { item: hit, sourceTime: hit.clip.in + local * hit.clip.speed };
}

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export type Action =
  | { type: "addClip"; clip: Clip }
  | { type: "updateClip"; id: string; patch: Partial<Omit<Clip, "id" | "sourceId">> }
  | { type: "deleteClip"; id: string }
  | { type: "moveClip"; id: string; direction: -1 | 1 }
  | { type: "split"; t: number }
  | { type: "addText"; text: TextLayer }
  | { type: "updateText"; id: string; patch: Partial<Omit<TextLayer, "id">> }
  | { type: "deleteText"; id: string }
  | { type: "setRatio"; ratio: RatioId }
  | { type: "setOverlays"; overlays: Overlays };

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
          if (next.out - next.in < MIN_CLIP) {
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
      const hit = layout(p.clips).find((i) => a.t > i.start + MIN_CLIP && a.t < i.end - MIN_CLIP);
      if (!hit) return p;
      const at = hit.clip.in + (a.t - hit.start) * hit.clip.speed;
      const first: Clip = { ...hit.clip, out: at };
      const second: Clip = { ...hit.clip, id: newId("clip"), in: at };
      return { ...p, clips: p.clips.flatMap((c) => (c.id === hit.clip.id ? [first, second] : [c])) };
    }
    case "addText":
      return { ...p, texts: [...p.texts, a.text] };
    case "updateText":
      return { ...p, texts: p.texts.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) };
    case "deleteText":
      return { ...p, texts: p.texts.filter((t) => t.id !== a.id) };
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
  if (a.type === "updateClip" || a.type === "updateText") return `${a.type}:${a.id}:${Object.keys(a.patch).sort().join(",")}`;
  if (a.type === "setOverlays") return "setOverlays";
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
