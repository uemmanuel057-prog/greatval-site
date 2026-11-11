/** Data model for the Video Studio. Everything here lives in the visitor's browser. */

export type RatioId = "vertical" | "wide" | "square";
export type QualityId = "720" | "1080";

/** A video file the visitor added. Kept outside the undo history. */
export interface Source {
  id: string;
  name: string;
  url: string;
  duration: number;
  width: number;
  height: number;
}

/** A piece of a source on the timeline. In and out are seconds in the source. */
export interface Clip {
  id: string;
  sourceId: string;
  in: number;
  out: number;
  speed: number;
  /** 0 to 1. */
  volume: number;
}

export type TextPosition = "top" | "middle" | "bottom";
export type TextSize = "s" | "m" | "l";
export type TextColor = "white" | "gold";

export interface TextLayer {
  id: string;
  text: string;
  /** Timeline seconds. */
  start: number;
  end: number;
  position: TextPosition;
  size: TextSize;
  color: TextColor;
}

export interface Overlays {
  watermark: boolean;
  lowerThird: { on: boolean; title: string; subtitle: string };
  banner: { on: boolean; text: string };
}

export interface Project {
  clips: Clip[];
  texts: TextLayer[];
  ratio: RatioId;
  overlays: Overlays;
}

export type Selection = { kind: "clip"; id: string } | { kind: "text"; id: string } | null;

export const ratios: Record<RatioId, { label: string; hint: string; w: number; h: number }> = {
  vertical: { label: "9:16", hint: "Reels, TikTok, Shorts", w: 9, h: 16 },
  wide: { label: "16:9", hint: "YouTube", w: 16, h: 9 },
  square: { label: "1:1", hint: "Feed posts", w: 1, h: 1 },
};

/** Canvas size in pixels for a ratio and quality. */
export function canvasSize(ratio: RatioId, quality: QualityId): { width: number; height: number } {
  const short = quality === "1080" ? 1080 : 720;
  const r = ratios[ratio];
  if (r.w === r.h) return { width: short, height: short };
  return r.w < r.h
    ? { width: short, height: Math.round((short * r.h) / r.w) }
    : { width: Math.round((short * r.w) / r.h), height: short };
}

export const initialProject: Project = {
  clips: [],
  texts: [],
  ratio: "vertical",
  overlays: {
    watermark: true,
    lowerThird: { on: false, title: "", subtitle: "" },
    banner: { on: false, text: "greatval.co" },
  },
};
