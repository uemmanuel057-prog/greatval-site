"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Scissors, Snowflake, Trash2 } from "lucide-react";
import { analyzeStabilize } from "@/lib/studio/analysis";
import { REVERSE_MAX_SECONDS } from "@/lib/studio/engine";
import { formatTime } from "@/lib/studio/format";
import { clipDuration, evalTransform, layout } from "@/lib/studio/project";
import {
  filterPresets,
  neutralAdjust,
  type Adjust,
  type Clip,
  type Keyframe,
  type Mask,
  type MaskShape,
  type SpeedCurve,
  type Transform,
  type TransitionType,
} from "@/lib/studio/types";
import type { StudioEngine } from "@/lib/studio/engine";
import { useEngineValue } from "./use-engine-value";
import { ActionButton, Empty, Group, Note, Pill, PillRow, Slider, type PanelProps } from "./ui";

const speeds = [0.5, 1, 1.5, 2, 3];
const curves: { id: SpeedCurve; label: string; hint: string }[] = [
  { id: "none", label: "Steady", hint: "Constant speed" },
  { id: "rampUp", label: "Speed up", hint: "Slow to fast" },
  { id: "rampDown", label: "Slow down", hint: "Fast to slow" },
  { id: "pulse", label: "Slow edges", hint: "Slow, fast, slow" },
  { id: "hero", label: "Hero", hint: "Fast, slow, fast" },
];

type ClipProps = PanelProps & { clip: Clip; index: number };

function supportsColourTools(): boolean {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    return Boolean(ctx && "filter" in ctx);
  } catch {
    return false;
  }
}

function useColourTools(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    supportsColourTools,
    () => true,
  );
}

// ---- Edit ----

export function EditPanel({ clip, index, project, dispatch, engine, sources, run, total }: ClipProps) {
  const source = sources.find((s) => s.id === clip.sourceId);
  const max = source?.duration ?? clip.out;
  const frozen = clip.freeze !== undefined;
  const patch = (p: Partial<Clip>) => dispatch({ type: "updateClip", id: clip.id, patch: p });

  async function toggleReverse() {
    if (clip.reverse) return patch({ reverse: false });
    await run("Preparing reverse...", async (progress) => {
      await engine?.ensureReverse(clip, progress);
      patch({ reverse: true });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{frozen ? "Freeze frame" : `Clip ${index + 1}`}</p>
          <p className="mt-1 truncate text-sm text-ink-muted">{source?.name}</p>
          <p className="font-mono text-xs text-ink-subtle">
            {formatTime(clipDuration(clip))} of {formatTime(total)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label="Move earlier" disabled={index === 0} onClick={() => dispatch({ type: "moveClip", id: clip.id, direction: -1 })} className="btn-glass !min-h-10 !px-3 disabled:opacity-40">
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Move later" disabled={index === project.clips.length - 1} onClick={() => dispatch({ type: "moveClip", id: clip.id, direction: 1 })} className="btn-glass !min-h-10 !px-3 disabled:opacity-40">
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Delete clip" onClick={() => dispatch({ type: "deleteClip", id: clip.id })} className="btn-glass !min-h-10 !px-3">
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => engine && dispatch({ type: "split", t: engine.getTime() })} disabled={frozen}>
          <Scissors size={15} aria-hidden="true" /> Split here
        </ActionButton>
        <ActionButton onClick={() => engine && dispatch({ type: "freeze", t: engine.getTime(), duration: 2 })} disabled={frozen}>
          <Snowflake size={15} aria-hidden="true" /> Freeze frame
        </ActionButton>
      </div>

      {frozen ? (
        <Slider label="Hold for" value={Number((clip.out - clip.in).toFixed(1))} min={0.5} max={10} step={0.1} format={(v) => `${v}s`} onChange={(v) => patch({ out: clip.in + v })} />
      ) : (
        <Group title="Trim" open>
          <Slider label="Start" value={clip.in} min={0} max={max} step={0.05} format={formatTime} onChange={(v) => patch({ in: Math.min(v, clip.out - 0.2) })} />
          <Slider label="End" value={clip.out} min={0} max={max} step={0.05} format={formatTime} onChange={(v) => patch({ out: Math.max(v, clip.in + 0.2) })} />
        </Group>
      )}

      {!frozen ? (
        <Group title="Speed">
          <PillRow label="Speed">
            {speeds.map((s) => (
              <Pill key={s} active={clip.speed === s} onClick={() => patch({ speed: s })}>
                {s}x
              </Pill>
            ))}
          </PillRow>
          <div>
            <p className="mb-2 text-xs text-ink-muted">Speed curve</p>
            <PillRow label="Speed curve">
              {curves.map((c) => (
                <Pill key={c.id} active={clip.curve === c.id} title={c.hint} onClick={() => patch({ curve: c.id })}>
                  {c.label}
                </Pill>
              ))}
            </PillRow>
          </div>
          <Pill active={clip.reverse} onClick={toggleReverse}>
            Reverse
          </Pill>
          <Note>
            Reverse works on clips up to {REVERSE_MAX_SECONDS} seconds and plays without sound. Splitting a curved clip makes each part steady.
          </Note>
        </Group>
      ) : null}

      <Group title="Frame and crop">
        <PillRow label="Fit">
          <Pill active={clip.fit === "fill"} onClick={() => patch({ fit: "fill" })}>
            Fill frame
          </Pill>
          <Pill active={clip.fit === "fit"} onClick={() => patch({ fit: "fit" })}>
            Fit inside
          </Pill>
        </PillRow>
        <Slider label="Crop zoom" value={clip.crop.zoom} min={1} max={3} step={0.05} format={(v) => `${v.toFixed(2)}x`} onChange={(v) => patch({ crop: { ...clip.crop, zoom: v } })} />
        <Slider label="Move left / right" value={clip.crop.x} min={-1} max={1} step={0.02} disabled={clip.crop.zoom <= 1} format={(v) => v.toFixed(2)} onChange={(v) => patch({ crop: { ...clip.crop, x: v } })} />
        <Slider label="Move up / down" value={clip.crop.y} min={-1} max={1} step={0.02} disabled={clip.crop.zoom <= 1} format={(v) => v.toFixed(2)} onChange={(v) => patch({ crop: { ...clip.crop, y: v } })} />
        <Note>Use Fit inside to see your canvas background around the video.</Note>
      </Group>
    </div>
  );
}

export function NoClip() {
  return <Empty>Tap a clip on the timeline to edit it.</Empty>;
}

// ---- Look ----

const adjustSliders: { key: keyof Adjust; label: string; min: number; max: number }[] = [
  { key: "brightness", label: "Brightness", min: -100, max: 100 },
  { key: "contrast", label: "Contrast", min: -100, max: 100 },
  { key: "saturation", label: "Saturation", min: -100, max: 100 },
  { key: "exposure", label: "Exposure", min: -100, max: 100 },
  { key: "warmth", label: "Warmth", min: -100, max: 100 },
  { key: "tint", label: "Tint", min: -100, max: 100 },
  { key: "fade", label: "Fade", min: 0, max: 100 },
  { key: "vignette", label: "Vignette", min: 0, max: 100 },
];

export function MaskEditor({ mask, onChange }: { mask: Mask; onChange: (m: Mask) => void }) {
  const shapes: { id: MaskShape; label: string }[] = [
    { id: "none", label: "None" },
    { id: "circle", label: "Circle" },
    { id: "rectangle", label: "Rectangle" },
    { id: "linear", label: "Linear" },
  ];
  return (
    <div className="space-y-3">
      <PillRow label="Mask shape">
        {shapes.map((s) => (
          <Pill key={s.id} active={mask.shape === s.id} onClick={() => onChange({ ...mask, shape: s.id })}>
            {s.label}
          </Pill>
        ))}
      </PillRow>
      {mask.shape !== "none" ? (
        <>
          <Slider label="Size" value={mask.size} min={0.2} max={1} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onChange({ ...mask, size: v })} />
          <Pill active={mask.invert} onClick={() => onChange({ ...mask, invert: !mask.invert })}>
            Invert
          </Pill>
        </>
      ) : null}
    </div>
  );
}

export function LookPanel({ clip, engine, sources, run, notify, dispatch }: ClipProps) {
  const colourOk = useColourTools();
  const patch = (p: Partial<Clip>) => dispatch({ type: "updateClip", id: clip.id, patch: p });
  const source = sources.find((s) => s.id === clip.sourceId);

  async function toggleBackground() {
    if (clip.removeBg) return patch({ removeBg: false });
    if (!engine) return;
    await run("Loading the background remover...", async (_p, _c, label) => {
      await engine.enableBackgroundRemoval(label);
      patch({ removeBg: true, chroma: { ...clip.chroma, on: false } });
    });
  }

  async function toggleStabilize() {
    if (clip.stabilize) return patch({ stabilize: false });
    if (!engine || !source) return;
    if (clip.out - clip.in > 60) return notify("Stabilize works on clips up to 60 seconds. Trim or split the clip first.");
    await run("Analysing camera shake...", async (progress, cancelled) => {
      engine.setStabilize(source.id, await analyzeStabilize(source.url, clip.in, clip.out, progress, cancelled));
      patch({ stabilize: true });
    });
  }

  return (
    <div className="space-y-4">
      {!colourOk ? <Note>Colour tools need Chrome, Edge or Firefox. They are switched off in this browser.</Note> : null}

      <Group title="Filters" open>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {filterPresets.map((f) => (
            <Pill key={f.id} active={clip.filter === f.id} disabled={!colourOk} onClick={() => patch({ filter: f.id, adjust: { ...neutralAdjust, ...f.adjust } })}>
              {f.label}
            </Pill>
          ))}
        </div>
      </Group>

      <Group title="Adjust">
        {adjustSliders.map((s) => (
          <Slider
            key={s.key}
            label={s.label}
            value={clip.adjust[s.key] as number}
            min={s.min}
            max={s.max}
            disabled={!colourOk && s.key !== "vignette"}
            onChange={(v) => patch({ filter: "custom", adjust: { ...clip.adjust, [s.key]: v } })}
          />
        ))}
        <Pill active={clip.adjust.grayscale} disabled={!colourOk} onClick={() => patch({ filter: "custom", adjust: { ...clip.adjust, grayscale: !clip.adjust.grayscale } })}>
          Black and white
        </Pill>
        <Note>Highlights, shadows, HSL and curves are not in this version.</Note>
      </Group>

      <Group title="Mask">
        <MaskEditor mask={clip.mask} onChange={(mask) => patch({ mask })} />
      </Group>

      <Group title="Remove background">
        <Pill active={clip.removeBg} onClick={toggleBackground}>
          Remove background (beta)
        </Pill>
        <Note>Cuts a person out of the footage. The first use downloads a small model and needs a connection. The cut-out sits on your canvas background.</Note>
        <div className="space-y-3 border-t border-white/10 pt-4">
          <Pill active={clip.chroma.on} disabled={clip.removeBg} onClick={() => patch({ chroma: { ...clip.chroma, on: !clip.chroma.on } })}>
            Green screen (chroma key)
          </Pill>
          {clip.chroma.on ? (
            <>
              <div className="flex items-center gap-3">
                <input type="color" aria-label="Colour to remove" value={clip.chroma.color} onChange={(e) => patch({ chroma: { ...clip.chroma, color: e.target.value } })} className="size-10 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
                <PillRow label="Key colour">
                  <Pill onClick={() => patch({ chroma: { ...clip.chroma, color: "#00ff00" } })}>Green</Pill>
                  <Pill onClick={() => patch({ chroma: { ...clip.chroma, color: "#0000ff" } })}>Blue</Pill>
                </PillRow>
              </div>
              <Slider label="Strength" value={clip.chroma.tolerance} min={5} max={100} onChange={(v) => patch({ chroma: { ...clip.chroma, tolerance: v } })} />
            </>
          ) : null}
        </div>
      </Group>

      <Group title="Stabilize and blur">
        <Pill active={clip.stabilize} onClick={toggleStabilize}>
          Stabilize
        </Pill>
        <Note>Smooths shaky handheld footage and zooms in slightly to hide the edges. It reads the clip first, which takes a little while.</Note>
        <Slider label="Motion blur" value={clip.motionBlur} min={0} max={100} onChange={(v) => patch({ motionBlur: v })} />
      </Group>
    </div>
  );
}

// ---- Motion ----

type NumericKey = keyof Transform;

const KEY_MERGE = 0.05;

/** Edits a layer's position, size, rotation and opacity, with optional animation. */
export function TransformEditor({
  engine,
  start,
  length,
  tf,
  keys,
  onTf,
  onKeys,
}: {
  engine: StudioEngine | null;
  start: number;
  length: number;
  tf: Transform;
  keys: Keyframe[];
  onTf: (tf: Transform) => void;
  onKeys: (keys: Keyframe[]) => void;
}) {
  const [animate, setAnimate] = useState(false);
  const time = useEngineValue(engine, (e) => Math.round(e.getTime() * 10) / 10, 0);
  const local = Math.min(Math.max(time - start, 0), length);
  const shown = evalTransform(tf, keys, local);

  function change(prop: NumericKey, value: number) {
    const hasKeys = keys.some((k) => k.values[prop] !== undefined);
    if (!animate && !hasKeys) return onTf({ ...tf, [prop]: value });
    const t = Number(local.toFixed(2));
    const existing = keys.find((k) => Math.abs(k.t - t) < KEY_MERGE);
    if (existing) onKeys(keys.map((k) => (k === existing ? { ...k, values: { ...k.values, [prop]: value } } : k)));
    else {
      // Start from the values shown now, so the first keyframe does not make things jump.
      onKeys([...keys, { t, values: { [prop]: value } }].sort((a, b) => a.t - b.t));
    }
  }

  const presets: { label: string; keys: Keyframe[] }[] = [
    { label: "Zoom in", keys: [{ t: 0, values: { scale: 1 } }, { t: length, values: { scale: 1.25 } }] },
    { label: "Zoom out", keys: [{ t: 0, values: { scale: 1.25 } }, { t: length, values: { scale: 1 } }] },
    { label: "Pan right", keys: [{ t: 0, values: { scale: 1.2, x: -0.07 } }, { t: length, values: { scale: 1.2, x: 0.07 } }] },
    { label: "Pan left", keys: [{ t: 0, values: { scale: 1.2, x: 0.07 } }, { t: length, values: { scale: 1.2, x: -0.07 } }] },
    { label: "Fade in", keys: [{ t: 0, values: { opacity: 0 } }, { t: Math.min(0.8, length), values: { opacity: 1 } }] },
    { label: "Fade out", keys: [{ t: Math.max(0, length - 0.8), values: { opacity: 1 } }, { t: length, values: { opacity: 0 } }] },
    { label: "Pop in", keys: [{ t: 0, values: { scale: 0.7, opacity: 0, rotation: -8 } }, { t: Math.min(0.5, length), values: { scale: 1, opacity: 1, rotation: 0 } }] },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs text-ink-muted">Quick animations</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {presets.map((p) => (
            <Pill key={p.label} onClick={() => onKeys(p.keys)}>
              {p.label}
            </Pill>
          ))}
        </div>
      </div>

      <Pill active={animate} onClick={() => setAnimate(!animate)}>
        Keyframe mode {animate ? "on" : "off"}
      </Pill>
      <Note>
        {animate
          ? "Move the playhead, then change a slider. A keyframe is saved at the playhead and the values blend between keyframes."
          : "Turn on keyframe mode to animate with your own keyframes."}
      </Note>

      <Slider label="Size" value={Number(shown.scale.toFixed(2))} min={0.2} max={3} step={0.02} format={(v) => `${v.toFixed(2)}x`} onChange={(v) => change("scale", v)} />
      <Slider label="Left / right" value={Number(shown.x.toFixed(2))} min={-1} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => change("x", v)} />
      <Slider label="Up / down" value={Number(shown.y.toFixed(2))} min={-1} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => change("y", v)} />
      <Slider label="Rotate" value={Math.round(shown.rotation)} min={-180} max={180} format={(v) => `${v}°`} onChange={(v) => change("rotation", v)} />
      <Slider label="Opacity" value={Number(shown.opacity.toFixed(2))} min={0} max={1} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => change("opacity", v)} />

      {keys.length ? (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">Keyframes</p>
          <div className="flex flex-wrap gap-2">
            {keys.map((k) => (
              <span key={`${k.t}-${Object.keys(k.values).join()}`} className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 py-1 pl-3 pr-1 font-mono text-xs text-accent">
                {formatTime(k.t)}
                <button type="button" aria-label={`Remove keyframe at ${formatTime(k.t)}`} onClick={() => onKeys(keys.filter((x) => x !== k))} className="grid size-6 place-items-center rounded-full hover:bg-white/10">
                  ×
                </button>
              </span>
            ))}
          </div>
          <Pill onClick={() => onKeys([])}>Clear animation</Pill>
        </div>
      ) : null}
    </div>
  );
}

const transitions: { id: TransitionType; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "wipe", label: "Wipe" },
  { id: "zoom", label: "Zoom" },
  { id: "slide", label: "Slide" },
];

export function MotionPanel({ clip, index, project, dispatch, engine }: ClipProps) {
  const item = layout(project.clips)[index];
  const length = item ? item.end - item.start : 1;
  const patch = (p: Partial<Clip>) => dispatch({ type: "updateClip", id: clip.id, patch: p });
  return (
    <div className="space-y-4">
      <Group title="Transition into this clip" open>
        <PillRow label="Transition">
          {transitions.map((t) => (
            <Pill key={t.id} active={clip.transition.type === t.id} disabled={index === 0 && t.id !== "none"} onClick={() => patch({ transition: { ...clip.transition, type: t.id } })}>
              {t.label}
            </Pill>
          ))}
        </PillRow>
        {index === 0 ? <Note>The first clip has nothing before it. Pick another clip to add a transition.</Note> : null}
        {clip.transition.type !== "none" ? (
          <Slider label="Length" value={clip.transition.duration} min={0.2} max={1.5} step={0.05} format={(v) => `${v.toFixed(2)}s`} onChange={(v) => patch({ transition: { ...clip.transition, duration: v } })} />
        ) : null}
      </Group>
      <Group title="Position and animation" open>
        <TransformEditor engine={engine} start={item?.start ?? 0} length={length} tf={clip.tf} keys={clip.keys} onTf={(tf) => patch({ tf })} onKeys={(keys) => patch({ keys })} />
      </Group>
    </div>
  );
}
