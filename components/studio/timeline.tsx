"use client";

import { useRef } from "react";
import { Type } from "lucide-react";
import type { StudioEngine } from "@/lib/studio/engine";
import { formatTime } from "@/lib/studio/format";
import { layout, totalDuration } from "@/lib/studio/project";
import type { Project, Selection, Source } from "@/lib/studio/types";
import { useEngineValue } from "./use-engine-value";

const LABEL_WIDTH = 0;

function Playhead({ engine, pxPerSec, height }: { engine: StudioEngine | null; pxPerSec: number; height: number }) {
  const t = useEngineValue(engine, (e) => e.getTime(), 0);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 z-20 w-0.5 bg-accent"
      style={{ left: t * pxPerSec + LABEL_WIDTH, height }}
    >
      <span className="absolute -left-1.5 -top-0.5 size-3.5 rounded-full bg-accent" />
    </div>
  );
}

/** Ruler, clip track and text track. Click or drag anywhere to move the playhead. */
export function Timeline({
  engine,
  project,
  sources,
  selection,
  onSelect,
  pxPerSec,
}: {
  engine: StudioEngine | null;
  project: Project;
  sources: Source[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  pxPerSec: number;
}) {
  const content = useRef<HTMLDivElement>(null);
  const items = layout(project.clips);
  const total = totalDuration(project.clips);
  const width = Math.max(total * pxPerSec + 80, 300);
  const rulerH = 28;
  const clipTrackH = 64;
  const textTrackH = 40;
  const height = rulerH + clipTrackH + textTrackH + 16;
  const nameOf = (id: string) => sources.find((s) => s.id === id)?.name ?? "Clip";

  const seekTo = (clientX: number) => {
    const rect = content.current?.getBoundingClientRect();
    if (!rect || !engine) return;
    engine.seek((clientX - rect.left) / pxPerSec);
  };

  const step = pxPerSec >= 80 ? 1 : pxPerSec >= 40 ? 2 : 5;
  const ticks = Array.from({ length: Math.floor(total / step) + 2 }, (_, i) => i * step);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20" role="region" aria-label="Timeline">
      <div
        ref={content}
        className="relative touch-pan-x select-none"
        style={{ width, height }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          seekTo(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1 && e.currentTarget.hasPointerCapture(e.pointerId)) seekTo(e.clientX);
        }}
      >
        <div className="relative border-b border-white/10" style={{ height: rulerH }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 h-full border-l border-white/10 pl-1.5 pt-1 font-mono text-[10px] text-ink-subtle"
              style={{ left: t * pxPerSec }}
            >
              {formatTime(t).replace(/\.0$/, "")}
            </span>
          ))}
        </div>

        <div className="relative" style={{ height: clipTrackH }}>
          {items.map(({ clip, start, end }, index) => {
            const selected = selection?.kind === "clip" && selection.id === clip.id;
            return (
              <button
                key={clip.id}
                type="button"
                aria-pressed={selected}
                aria-label={`Clip ${index + 1}: ${nameOf(clip.sourceId)}`}
                onClick={(e) => {
                  onSelect({ kind: "clip", id: clip.id });
                  const rect = content.current?.getBoundingClientRect();
                  if (rect && engine) engine.seek((e.clientX - rect.left) / pxPerSec);
                }}
                className={`absolute top-2 overflow-hidden rounded-lg border-2 px-2 py-1 text-left text-xs transition-colors ${
                  selected
                    ? "border-accent bg-accent/25 text-ink"
                    : "border-white/15 bg-gradient-to-br from-navy to-canvas text-ink-muted hover:border-accent/60"
                }`}
                style={{ left: start * pxPerSec, width: Math.max((end - start) * pxPerSec - 2, 14), height: clipTrackH - 12 }}
              >
                <span className="block truncate font-semibold">{nameOf(clip.sourceId)}</span>
                <span className="block font-mono text-[10px] text-ink-subtle">
                  {formatTime(end - start)}
                  {clip.speed !== 1 ? ` · ${clip.speed}x` : ""}
                </span>
              </button>
            );
          })}
          {!items.length ? (
            <p className="px-4 py-5 text-sm text-ink-subtle">Your clips appear here.</p>
          ) : null}
        </div>

        <div className="relative" style={{ height: textTrackH }}>
          {project.texts.map((layer) => {
            const selected = selection?.kind === "text" && selection.id === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                aria-pressed={selected}
                aria-label={`Text: ${layer.text || "empty"}`}
                onClick={() => {
                  onSelect({ kind: "text", id: layer.id });
                  engine?.seek(layer.start);
                }}
                className={`absolute top-1.5 flex items-center gap-1.5 overflow-hidden rounded-lg border px-2 text-xs ${
                  selected ? "border-accent bg-accent/25 text-ink" : "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                }`}
                style={{
                  left: layer.start * pxPerSec,
                  width: Math.max((layer.end - layer.start) * pxPerSec - 2, 18),
                  height: textTrackH - 10,
                }}
              >
                <Type size={12} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{layer.text || "Text"}</span>
              </button>
            );
          })}
        </div>

        <Playhead engine={engine} pxPerSec={pxPerSec} height={height} />
      </div>
    </div>
  );
}
