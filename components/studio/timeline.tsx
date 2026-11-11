"use client";

import { useRef } from "react";
import { Camera, Music2, Type, Layers, Snowflake } from "lucide-react";
import type { StudioEngine } from "@/lib/studio/engine";
import { formatTime } from "@/lib/studio/format";
import { layout, totalDuration } from "@/lib/studio/project";
import type { Dispatch } from "./ui";
import type { Project, Selection, Source } from "@/lib/studio/types";
import { useEngineValue } from "./use-engine-value";

function Playhead({ engine, pxPerSec, height }: { engine: StudioEngine | null; pxPerSec: number; height: number }) {
  const t = useEngineValue(engine, (e) => e.getTime(), 0);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-0 z-20 w-0.5 bg-accent" style={{ left: t * pxPerSec, height }}>
      <span className="absolute -left-1.5 -top-0.5 size-3.5 rounded-full bg-accent" />
    </div>
  );
}

interface BarProps {
  start: number;
  end: number;
  pxPerSec: number;
  selected: boolean;
  label: string;
  icon: React.ReactNode;
  tone: "gold" | "cyan" | "slate";
  onSelect: () => void;
  onMove: (newStart: number) => void;
  minWidth?: number;
}

const tones = {
  gold: "border-accent/50 bg-accent/15 text-accent",
  cyan: "border-code/50 bg-code/15 text-code",
  slate: "border-white/20 bg-white/10 text-ink-muted",
};

/** A bar on the timeline that can be tapped and dragged sideways. */
function Bar({ start, end, pxPerSec, selected, label, icon, tone, onSelect, onMove, minWidth = 26 }: BarProps) {
  const drag = useRef<{ x: number; start: number } | null>(null);
  return (
    <div
      data-bar
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, start };
        onSelect();
      }}
      onPointerMove={(e) => {
        if (drag.current) onMove(Math.max(0, drag.current.start + (e.clientX - drag.current.x) / pxPerSec));
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      className={`absolute top-0 flex h-full touch-none items-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-1.5 text-[11px] ${tones[tone]} ${selected ? "ring-2 ring-accent" : ""}`}
      style={{ left: start * pxPerSec, width: Math.max((end - start) * pxPerSec, minWidth) }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

/** Ruler and tracks. Click or drag the ruler or clips to move the playhead. Drag other bars sideways to move them. */
export function Timeline({
  engine,
  project,
  sources,
  selection,
  onSelect,
  dispatch,
  pxPerSec,
}: {
  engine: StudioEngine | null;
  project: Project;
  sources: Source[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  dispatch: Dispatch;
  pxPerSec: number;
}) {
  const content = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const items = layout(project.clips);
  const total = totalDuration(project.clips);
  const extent = Math.max(total, ...project.layers.map((l) => l.end), ...project.texts.map((t) => t.end), ...project.audio.map((a) => a.start + 1));
  const width = Math.max(extent * pxPerSec + 80, 300);
  const nameOf = (id: string) => sources.find((s) => s.id === id)?.name ?? "Clip";

  const rows = [
    { key: "layers", show: project.layers.length > 0 },
    { key: "text", show: project.texts.length > 0 || project.captions.length > 0 },
    { key: "audio", show: project.audio.length > 0 },
  ].filter((r) => r.show);
  const rulerH = 26;
  const clipH = 54;
  const rowH = 28;
  const height = rulerH + clipH + rows.length * (rowH + 6) + 14;

  const seekTo = (clientX: number) => {
    const rect = content.current?.getBoundingClientRect();
    if (rect && engine) engine.seek((clientX - rect.left) / pxPerSec);
  };

  const step = pxPerSec >= 80 ? 1 : pxPerSec >= 40 ? 2 : 5;
  const ticks = Array.from({ length: Math.floor(extent / step) + 2 }, (_, i) => i * step);
  let rowTop = rulerH + clipH + 8;
  const place = () => {
    const top = rowTop;
    rowTop += rowH + 6;
    return top;
  };

  const captionStart = project.captions[0]?.start;
  const captionEnd = project.captions[project.captions.length - 1]?.end;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30" tabIndex={0} aria-label="Timeline">
      <div
        ref={content}
        className="relative select-none"
        style={{ width, height, touchAction: "pan-x pan-y" }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-bar], button")) return;
          scrubbing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          seekTo(e.clientX);
        }}
        onPointerMove={(e) => scrubbing.current && seekTo(e.clientX)}
        onPointerUp={() => (scrubbing.current = false)}
        onPointerCancel={() => (scrubbing.current = false)}
      >
        <div className="absolute inset-x-0 top-0 border-b border-white/10" style={{ height: rulerH }}>
          {ticks.map((s) => (
            <span key={s} className="absolute top-1 border-l border-white/15 pl-1 font-mono text-[10px] text-ink-subtle" style={{ left: s * pxPerSec }}>
              {formatTime(s)}
            </span>
          ))}
          {project.beats.map((b) => (
            <span key={b} aria-hidden="true" className="absolute bottom-0 h-2 w-px bg-accent/80" style={{ left: b * pxPerSec }} />
          ))}
        </div>

        <div className="absolute" style={{ top: rulerH + 4, height: clipH, left: 0, width: total * pxPerSec }}>
          {items.map(({ clip, start, end }, i) => {
            const selected = selection?.kind === "clip" && selection.id === clip.id;
            const frozen = clip.freeze !== undefined;
            return (
              <button
                key={clip.id}
                type="button"
                aria-pressed={selected}
                aria-label={`${frozen ? "Freeze frame" : nameOf(clip.sourceId)}, ${formatTime(end - start)}`}
                onPointerDown={(e) => {
                  seekTo(e.clientX);
                  onSelect({ kind: "clip", id: clip.id });
                }}
                onClick={() => onSelect({ kind: "clip", id: clip.id })}
                className={`absolute top-0 flex h-full flex-col justify-center overflow-hidden rounded-lg border px-2 text-left text-[11px] ${
                  frozen ? "border-code/50 bg-code/15 text-code" : "border-accent/40 bg-accent/10 text-ink"
                } ${selected ? "ring-2 ring-accent" : ""}`}
                style={{ left: start * pxPerSec, width: Math.max((end - start) * pxPerSec - 2, 14) }}
              >
                <span className="flex items-center gap-1 truncate font-medium">
                  {frozen ? <Snowflake size={11} aria-hidden="true" /> : null}
                  {frozen ? "Freeze" : nameOf(clip.sourceId)}
                </span>
                <span className="truncate font-mono text-ink-subtle">
                  {formatTime(end - start)}
                  {clip.reverse ? " · rev" : ""}
                  {clip.curve !== "none" ? " · curve" : clip.speed !== 1 ? ` · ${clip.speed}x` : ""}
                </span>
                {i > 0 && clip.transition.type !== "none" ? <span aria-hidden="true" className="absolute left-0 top-0 h-full w-1 bg-code" /> : null}
              </button>
            );
          })}
        </div>

        {rows.map((r) => {
          const top = place();
          return (
            <div key={r.key} className="absolute left-0" style={{ top, height: rowH, width }}>
              {r.key === "layers"
                ? project.layers.map((l) => (
                    <Bar
                      key={l.id}
                      start={l.start}
                      end={l.end}
                      pxPerSec={pxPerSec}
                      tone="cyan"
                      icon={<Layers size={12} aria-hidden="true" />}
                      label={l.kind === "image" ? "Picture" : "Video"}
                      selected={selection?.kind === "layer" && selection.id === l.id}
                      onSelect={() => onSelect({ kind: "layer", id: l.id })}
                      onMove={(s) => dispatch({ type: "updateLayer", id: l.id, patch: { start: s, end: s + (l.end - l.start) } })}
                    />
                  ))
                : null}
              {r.key === "text" ? (
                <>
                  {project.texts.map((t) => (
                    <Bar
                      key={t.id}
                      start={t.start}
                      end={t.end}
                      pxPerSec={pxPerSec}
                      tone="gold"
                      icon={<Type size={12} aria-hidden="true" />}
                      label={t.text || "Text"}
                      selected={selection?.kind === "text" && selection.id === t.id}
                      onSelect={() => onSelect({ kind: "text", id: t.id })}
                      onMove={(s) => dispatch({ type: "updateText", id: t.id, patch: { start: s, end: s + (t.end - t.start) } })}
                    />
                  ))}
                  {captionStart !== undefined && captionEnd !== undefined ? (
                    <div aria-hidden="true" className="absolute bottom-0 h-1.5 rounded-full bg-white/30" style={{ left: captionStart * pxPerSec, width: (captionEnd - captionStart) * pxPerSec }} />
                  ) : null}
                </>
              ) : null}
              {r.key === "audio"
                ? project.audio.map((a) => (
                    <Bar
                      key={a.id}
                      start={a.start}
                      end={a.kind === "music" ? Math.max(a.start + 2, Math.min(total, a.start + (sources.find((s) => s.id === a.sourceId)?.duration ?? 2))) : a.start + 0.6}
                      pxPerSec={pxPerSec}
                      tone="slate"
                      icon={a.kind === "music" ? <Music2 size={12} aria-hidden="true" /> : <Camera size={12} aria-hidden="true" />}
                      label={a.kind === "music" ? "Music" : (a.sfx ?? "sfx")}
                      selected={selection?.kind === "audio" && selection.id === a.id}
                      onSelect={() => onSelect({ kind: "audio", id: a.id })}
                      onMove={(s) => dispatch({ type: "updateAudio", id: a.id, patch: { start: s } })}
                      minWidth={a.kind === "sfx" ? 44 : 26}
                    />
                  ))
                : null}
            </div>
          );
        })}

        <Playhead engine={engine} pxPerSec={pxPerSec} height={height} />
      </div>
    </div>
  );
}
