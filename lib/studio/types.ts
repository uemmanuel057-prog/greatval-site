/** Data model for the Video Studio. Everything here lives in the visitor's browser. */

export type RatioId = "vertical" | "wide" | "square";
export type QualityId = "720" | "1080";

/** A media file the visitor added. Kept outside the undo history. */
export interface Source {
  id: string;
  name: string;
  url: string;
  kind: "video" | "audio" | "image";
  duration: number;
  width: number;
  height: number;
}

// ---- looks ----

export interface Adjust {
  brightness: number; // -100..100
  contrast: number;
  saturation: number;
  exposure: number;
  warmth: number;
  tint: number;
  fade: number; // 0..100
  vignette: number; // 0..100
  grayscale: boolean;
}

export const neutralAdjust: Adjust = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  warmth: 0,
  tint: 0,
  fade: 0,
  vignette: 0,
  grayscale: false,
};

export const filterPresets: { id: string; label: string; adjust: Partial<Adjust> }[] = [
  { id: "none", label: "Original", adjust: {} },
  { id: "warm", label: "Warm", adjust: { warmth: 35, saturation: 10, contrast: 5 } },
  { id: "cool", label: "Cool", adjust: { warmth: -35, saturation: 5 } },
  { id: "vivid", label: "Vivid", adjust: { saturation: 40, contrast: 15 } },
  { id: "cinema", label: "Cinema", adjust: { contrast: 25, saturation: -15, warmth: 15, vignette: 35 } },
  { id: "gold", label: "Gold", adjust: { warmth: 55, saturation: 20, contrast: 10, vignette: 20 } },
  { id: "fade", label: "Faded", adjust: { fade: 45, saturation: -20, brightness: 5 } },
  { id: "mono", label: "Mono", adjust: { grayscale: true, contrast: 10 } },
  { id: "noir", label: "Noir", adjust: { grayscale: true, contrast: 40, brightness: -8, vignette: 45 } },
];

export type MaskShape = "none" | "circle" | "rectangle" | "linear";
export interface Mask {
  shape: MaskShape;
  size: number; // 0.2..1
  invert: boolean;
}
export const noMask: Mask = { shape: "none", size: 0.7, invert: false };

export type TransitionType = "none" | "fade" | "wipe" | "zoom" | "slide";
export interface Transition {
  type: TransitionType;
  duration: number; // seconds, split across the end of the previous clip and the start of this one
}

export type SpeedCurve = "none" | "rampUp" | "rampDown" | "pulse" | "hero";
export type VoiceEffect = "none" | "deep" | "high" | "robot" | "echo";

export interface Chroma {
  on: boolean;
  color: string; // #rrggbb
  tolerance: number; // 0..100
}

// ---- motion ----

export interface Transform {
  scale: number; // 1 = fit
  x: number; // fraction of the canvas width, -1..1
  y: number;
  rotation: number; // degrees
  opacity: number; // 0..1
}
export const baseTransform: Transform = { scale: 1, x: 0, y: 0, rotation: 0, opacity: 1 };
export type TransformKey = keyof Transform;

/** One animation point. Only the properties that were set are animated. */
export interface Keyframe {
  /** Seconds from the start of the layer on the timeline. */
  t: number;
  values: Partial<Transform>;
}

/** A point followed through the footage by the tracker. Coordinates are 0..1 inside the source frame. */
export interface Track {
  sourceId: string;
  /** Source time of the first point. */
  t0: number;
  fps: number;
  points: [number, number][];
}

export interface Clip {
  id: string;
  sourceId: string;
  /** In and out are seconds in the source. */
  in: number;
  out: number;
  speed: number;
  curve: SpeedCurve;
  /** 0 to 1. */
  volume: number;
  reverse: boolean;
  /** Source time of the frozen frame. The clip then shows that one frame for its whole length. */
  freeze?: number;
  fit: "fill" | "fit";
  /** Zoom and pan inside the frame. */
  crop: { zoom: number; x: number; y: number };
  filter: string;
  adjust: Adjust;
  mask: Mask;
  chroma: Chroma;
  removeBg: boolean;
  stabilize: boolean;
  motionBlur: number; // 0..100
  tf: Transform;
  keys: Keyframe[];
  transition: Transition;
  voice: VoiceEffect;
  cleanVoice: boolean;
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
  follow?: Track;
}

/** An image or a second video placed over the main footage (picture in picture). */
export interface OverlayLayer {
  id: string;
  sourceId: string;
  kind: "video" | "image";
  start: number;
  end: number;
  /** For videos: where in the source the overlay starts. */
  in: number;
  tf: Transform;
  keys: Keyframe[];
  mask: Mask;
  width: number; // fraction of the canvas width at scale 1
  follow?: Track;
}

export type AudioKind = "music" | "sfx";
export type SfxName = "whoosh" | "pop" | "boom" | "shutter";
export interface AudioItem {
  id: string;
  kind: AudioKind;
  /** For music. */
  sourceId?: string;
  sfx?: SfxName;
  /** Timeline seconds. */
  start: number;
  volume: number;
}

export interface CaptionWord {
  text: string;
  start: number;
  end: number;
}
export type CaptionStyle = "gold" | "box" | "serif";

export type BackgroundKind = "color" | "glow" | "blur" | "image";
export interface Background {
  kind: BackgroundKind;
  color: string;
  imageSourceId?: string;
}

export interface Mix {
  main: number;
  music: number;
  sfx: number;
}

export interface Overlays {
  watermark: boolean;
  lowerThird: { on: boolean; title: string; subtitle: string };
  banner: { on: boolean; text: string };
}

export interface Project {
  clips: Clip[];
  texts: TextLayer[];
  layers: OverlayLayer[];
  audio: AudioItem[];
  captions: CaptionWord[];
  captionStyle: CaptionStyle;
  /** Sound effect played at the start of every caption line. */
  captionSfx: SfxName | "none";
  beats: number[];
  background: Background;
  mix: Mix;
  ratio: RatioId;
  overlays: Overlays;
}

export type Selection =
  | { kind: "clip"; id: string }
  | { kind: "text"; id: string }
  | { kind: "layer"; id: string }
  | { kind: "audio"; id: string }
  | null;

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

export function newClip(id: string, sourceId: string, duration: number): Clip {
  return {
    id,
    sourceId,
    in: 0,
    out: duration,
    speed: 1,
    curve: "none",
    volume: 1,
    reverse: false,
    fit: "fill",
    crop: { zoom: 1, x: 0, y: 0 },
    filter: "none",
    adjust: neutralAdjust,
    mask: noMask,
    chroma: { on: false, color: "#00ff00", tolerance: 40 },
    removeBg: false,
    stabilize: false,
    motionBlur: 0,
    tf: baseTransform,
    keys: [],
    transition: { type: "none", duration: 0.6 },
    voice: "none",
    cleanVoice: false,
  };
}

export const initialProject: Project = {
  clips: [],
  texts: [],
  layers: [],
  audio: [],
  captions: [],
  captionStyle: "gold",
  captionSfx: "none",
  beats: [],
  background: { kind: "glow", color: "#0B0F17" },
  mix: { main: 1, music: 0.8, sfx: 1 },
  ratio: "vertical",
  overlays: {
    watermark: true,
    lowerThird: { on: false, title: "", subtitle: "" },
    banner: { on: false, text: "greatval.co" },
  },
};
