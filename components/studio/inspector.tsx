"use client";

import { ArrowLeft, ArrowRight, Scissors, Trash2 } from "lucide-react";
import { Chip, Field, Segmented, inputClass } from "@/components/graphics-generator/controls";
import { formatTime } from "@/lib/studio/format";
import { clipDuration } from "@/lib/studio/project";
import type { Action } from "@/lib/studio/project";
import {
  ratios,
  type Clip,
  type Overlays,
  type Project,
  type QualityId,
  type RatioId,
  type Source,
  type TextLayer,
} from "@/lib/studio/types";

type Dispatch = (a: Action) => void;

const speeds = [0.5, 1, 1.5, 2];

const rangeClass = "w-full accent-[#E5A93C]";

export function ClipPanel({
  clip,
  source,
  index,
  count,
  dispatch,
  onSplit,
}: {
  clip: Clip;
  source?: Source;
  index: number;
  count: number;
  dispatch: Dispatch;
  onSplit: () => void;
}) {
  const max = source?.duration ?? clip.out;
  return (
    <div className="card space-y-5 !p-5">
      <div>
        <p className="eyebrow">Clip {index + 1}</p>
        <p className="mt-1 truncate text-sm text-ink-muted">{source?.name}</p>
        <p className="font-mono text-xs text-ink-subtle">{formatTime(clipDuration(clip))} on the timeline</p>
      </div>

      <Field label="Start" hint={formatTime(clip.in)}>
        <input
          type="range"
          aria-label="Trim start"
          className={rangeClass}
          min={0}
          max={max}
          step={0.05}
          value={clip.in}
          onChange={(e) => dispatch({ type: "updateClip", id: clip.id, patch: { in: Math.min(Number(e.target.value), clip.out - 0.2) } })}
        />
      </Field>
      <Field label="End" hint={formatTime(clip.out)}>
        <input
          type="range"
          aria-label="Trim end"
          className={rangeClass}
          min={0}
          max={max}
          step={0.05}
          value={clip.out}
          onChange={(e) => dispatch({ type: "updateClip", id: clip.id, patch: { out: Math.max(Number(e.target.value), clip.in + 0.2) } })}
        />
      </Field>

      <Field label="Speed">
        <div className="flex flex-wrap gap-2">
          {speeds.map((s) => (
            <Chip key={s} active={clip.speed === s} onClick={() => dispatch({ type: "updateClip", id: clip.id, patch: { speed: s } })}>
              {s}x
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Volume" hint={`${Math.round(clip.volume * 100)}%`}>
        <input
          type="range"
          aria-label="Clip volume"
          className={rangeClass}
          min={0}
          max={1}
          step={0.05}
          value={clip.volume}
          onChange={(e) => dispatch({ type: "updateClip", id: clip.id, patch: { volume: Number(e.target.value) } })}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onSplit} className="btn-glass !min-h-10 !px-4">
          <Scissors size={16} aria-hidden="true" /> Split here
        </button>
        <button
          type="button"
          aria-label="Move clip earlier"
          disabled={index === 0}
          onClick={() => dispatch({ type: "moveClip", id: clip.id, direction: -1 })}
          className="btn-glass !min-h-10 !px-3 disabled:opacity-40"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Move clip later"
          disabled={index === count - 1}
          onClick={() => dispatch({ type: "moveClip", id: clip.id, direction: 1 })}
          className="btn-glass !min-h-10 !px-3 disabled:opacity-40"
        >
          <ArrowRight size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "deleteClip", id: clip.id })}
          className="btn-glass !min-h-10 !px-4 text-red-300"
        >
          <Trash2 size={16} aria-hidden="true" /> Delete
        </button>
      </div>
    </div>
  );
}

export function TextPanel({
  layer,
  total,
  dispatch,
}: {
  layer: TextLayer;
  total: number;
  dispatch: Dispatch;
}) {
  const set = (patch: Partial<Omit<TextLayer, "id">>) => dispatch({ type: "updateText", id: layer.id, patch });
  return (
    <div className="card space-y-5 !p-5">
      <p className="eyebrow">Text</p>
      <Field label="Words" htmlFor="text-words" hint={`${layer.text.length}/120`}>
        <textarea id="text-words" rows={3} maxLength={120} value={layer.text} onChange={(e) => set({ text: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Position">
        <Segmented
          label="Text position"
          value={layer.position}
          onChange={(position) => set({ position })}
          options={[
            { id: "top", label: "Top" },
            { id: "middle", label: "Middle" },
            { id: "bottom", label: "Bottom" },
          ]}
        />
      </Field>
      <Field label="Size">
        <Segmented
          label="Text size"
          value={layer.size}
          onChange={(size) => set({ size })}
          options={[
            { id: "s", label: "Small" },
            { id: "m", label: "Medium" },
            { id: "l", label: "Large" },
          ]}
        />
      </Field>
      <Field label="Colour">
        <Segmented
          label="Text colour"
          value={layer.color}
          onChange={(color) => set({ color })}
          options={[
            { id: "white", label: "White" },
            { id: "gold", label: "Gold" },
          ]}
        />
      </Field>
      <Field label="Shows from" hint={formatTime(layer.start)}>
        <input
          type="range"
          aria-label="Text start"
          className={rangeClass}
          min={0}
          max={Math.max(total, 0.5)}
          step={0.1}
          value={layer.start}
          onChange={(e) => set({ start: Math.min(Number(e.target.value), layer.end - 0.3) })}
        />
      </Field>
      <Field label="Until" hint={formatTime(layer.end)}>
        <input
          type="range"
          aria-label="Text end"
          className={rangeClass}
          min={0}
          max={Math.max(total, 0.5)}
          step={0.1}
          value={layer.end}
          onChange={(e) => set({ end: Math.max(Number(e.target.value), layer.start + 0.3) })}
        />
      </Field>
      <button type="button" onClick={() => dispatch({ type: "deleteText", id: layer.id })} className="btn-glass !min-h-10 !px-4 text-red-300">
        <Trash2 size={16} aria-hidden="true" /> Delete text
      </button>
    </div>
  );
}

export function ProjectPanel({
  project,
  quality,
  onQuality,
  dispatch,
}: {
  project: Project;
  quality: QualityId;
  onQuality: (q: QualityId) => void;
  dispatch: Dispatch;
}) {
  const o = project.overlays;
  const setOverlays = (next: Overlays) => dispatch({ type: "setOverlays", overlays: next });
  return (
    <div className="card space-y-5 !p-5">
      <p className="eyebrow">Canvas</p>
      <Field label="Shape">
        <Segmented
          label="Aspect ratio"
          value={project.ratio}
          onChange={(ratio: RatioId) => dispatch({ type: "setRatio", ratio })}
          options={(Object.keys(ratios) as RatioId[]).map((id) => ({ id, label: `${ratios[id].label} ${ratios[id].hint}` }))}
        />
      </Field>
      <Field label="Quality">
        <Segmented
          label="Export quality"
          value={quality}
          onChange={onQuality}
          options={[
            { id: "720", label: "720p (faster)" },
            { id: "1080", label: "1080p (sharper)" },
          ]}
        />
      </Field>

      <Field label="Overlays">
        <div className="space-y-4">
          <div>
            <Chip active={o.watermark} onClick={() => setOverlays({ ...o, watermark: !o.watermark })}>
              GREAT VAL logo {o.watermark ? "on" : "off"}
            </Chip>
          </div>
          <div className="space-y-2">
            <Chip active={o.lowerThird.on} onClick={() => setOverlays({ ...o, lowerThird: { ...o.lowerThird, on: !o.lowerThird.on } })}>
              Name tag {o.lowerThird.on ? "on" : "off"}
            </Chip>
            {o.lowerThird.on ? (
              <div className="space-y-2">
                <input
                  aria-label="Name tag title"
                  placeholder="Name or title"
                  maxLength={40}
                  value={o.lowerThird.title}
                  onChange={(e) => setOverlays({ ...o, lowerThird: { ...o.lowerThird, title: e.target.value } })}
                  className={inputClass}
                />
                <input
                  aria-label="Name tag subtitle"
                  placeholder="Handle or role, e.g. @greatvalfc"
                  maxLength={40}
                  value={o.lowerThird.subtitle}
                  onChange={(e) => setOverlays({ ...o, lowerThird: { ...o.lowerThird, subtitle: e.target.value } })}
                  className={inputClass}
                />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Chip active={o.banner.on} onClick={() => setOverlays({ ...o, banner: { ...o.banner, on: !o.banner.on } })}>
              Website banner {o.banner.on ? "on" : "off"}
            </Chip>
            {o.banner.on ? (
              <input
                aria-label="Banner text"
                maxLength={40}
                value={o.banner.text}
                onChange={(e) => setOverlays({ ...o, banner: { ...o.banner, text: e.target.value } })}
                className={inputClass}
              />
            ) : null}
          </div>
        </div>
      </Field>
    </div>
  );
}
