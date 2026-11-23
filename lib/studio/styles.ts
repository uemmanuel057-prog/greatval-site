import type { Cut } from "@/lib/reel/edl";
import { filterPresets, neutralAdjust, type CaptionStyle, type Clip, type Keyframe, type Project, type Recipe, type SfxName, type TransitionType } from "./types";
import { clipDuration } from "./project";

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
  /** Overrides punchIn when set. */
  motion?: Recipe["motion"];
  /** How hard to cut the pauses when this style is the starting point. */
  pace?: Recipe["pace"];
}

/** How far a punch-in zooms. Kept exact so clearing a style can find and undo it. */
export const PUNCH_ZOOM = 1.14;

export const reelStyles: ReelStyle[] = [
  {
    id: "great-val",
    name: "GREAT VAL",
    vibe: "Headline captions, tight cuts, light leaks, slow push-ins",
    swatch: ["#3a1d08", "#0B0F17"],
    ink: "#FFFFFF",
    caption: "reel",
    captionSfx: "none",
    filter: "vivid",
    transition: "leak",
    transitionDuration: 0.5,
    transitionSfx: "whoosh",
    punchIn: false,
    motion: "push",
    pace: "tight",
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
      keys: c.keys.filter((k) => !k.auto),
    })),
    transitionSfx: "none",
    captionSfx: "none",
    styleId: null,
    recipe: undefined,
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
    if (!cuts || c.freeze !== undefined || c.reverse || c.curve !== "none" || c.keys.some((k) => !k.auto)) {
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
          ? { ...c, in: a, out: b, keys: [] }
          : { ...c, id: makeId(), in: a, out: b, keys: [], joined: true, transition: { type: "none", duration: c.transition.duration } },
      );
    });
  }
  return { clips: out, saved, removed, skipped };
}

// ---- the edit builder ----

/** The parts of a recipe, applied one at a time so you can watch the edit come together. */
export type RecipePart = "look" | "transitions" | "motion" | "overlays" | "captions";

export function styleToRecipe(s: ReelStyle, base: Recipe): Recipe {
  return {
    ...base,
    look: s.filter,
    caption: s.caption,
    captionSfx: s.captionSfx,
    transition: s.transition,
    transitionDuration: s.transitionDuration,
    transitionSfx: s.transitionSfx,
    motion: s.motion ?? (s.punchIn ? "punch" : "none"),
    pace: s.pace ?? base.pace ?? "natural",
  };
}

export function defaultRecipe(p: Project): Recipe {
  if (p.recipe) return p.recipe;
  return {
    ...styleToRecipe(reelStyles[0], {} as Recipe),
    pace: "natural",
    watermark: p.overlays.watermark,
    lowerThird: { ...p.overlays.lowerThird },
    banner: { ...p.overlays.banner },
  };
}

const PUSH_ZOOM = 1.12;

function motionKeys(c: Clip, motion: Recipe["motion"], index: number): Keyframe[] {
  const own = c.keys.filter((k) => !k.auto);
  if (motion === "push" || motion === "drift") {
    const d = clipDuration(c);
    if (d < 0.3) return own;
    const dir = index % 2 ? -1 : 1;
    const auto: Keyframe[] =
      motion === "push"
        ? [
            { t: 0, values: { scale: 1 }, auto: true },
            { t: d, values: { scale: PUSH_ZOOM }, auto: true },
          ]
        : [
            { t: 0, values: { scale: PUSH_ZOOM, x: -0.035 * dir }, auto: true },
            { t: d, values: { scale: PUSH_ZOOM, x: 0.035 * dir }, auto: true },
          ];
    return [...own, ...auto];
  }
  return own;
}

/** Applies one part of a recipe. Pure, so it runs inside the reducer and Undo works. */
export function applyRecipePart(p: Project, r: Recipe, part: RecipePart): Project {
  switch (part) {
    case "look": {
      const preset = filterPresets.find((f) => f.id === r.look);
      return { ...p, clips: p.clips.map((c) => ({ ...c, filter: r.look, adjust: { ...neutralAdjust, ...(preset?.adjust ?? {}) } })), recipe: r };
    }
    case "transitions":
      return {
        ...p,
        clips: p.clips.map((c, i) => ({ ...c, transition: { type: i > 0 && !c.joined ? r.transition : "none", duration: r.transitionDuration } })),
        transitionSfx: r.transition === "none" ? "none" : r.transitionSfx,
        recipe: r,
      };
    case "motion": {
      let zoomed = false;
      return {
        ...p,
        clips: p.clips.map((c, i) => {
          if (i > 0) zoomed = !zoomed;
          const crop = r.motion === "punch" ? { ...c.crop, zoom: zoomed ? PUNCH_ZOOM : 1 } : c.crop.zoom === PUNCH_ZOOM ? { ...c.crop, zoom: 1 } : c.crop;
          return { ...c, crop, keys: c.freeze !== undefined ? c.keys : motionKeys(c, r.motion, i) };
        }),
        recipe: r,
      };
    }
    case "overlays":
      return {
        ...p,
        overlays: { watermark: r.watermark, lowerThird: { ...r.lowerThird }, banner: { ...r.banner } },
        recipe: r,
      };
    case "captions":
      return {
        ...p,
        captionStyle: r.caption === "off" ? p.captionStyle : r.caption,
        captionSfx: r.caption === "off" ? "none" : r.captionSfx,
        captions: r.caption === "off" ? [] : p.captions,
        recipe: r,
      };
  }
}
