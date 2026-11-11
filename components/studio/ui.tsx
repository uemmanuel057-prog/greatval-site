"use client";

import type { ReactNode } from "react";
import type { StudioEngine } from "@/lib/studio/engine";
import type { Action as ProjectAction } from "@/lib/studio/project";
import type { Project, Selection, Source } from "@/lib/studio/types";

/** Small building blocks that keep every panel looking the same. */

export const rangeClass = "studio-range w-full";

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono tabular-nums text-ink-subtle">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        className={`${rangeClass} mt-1`}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Pill({
  active,
  onClick,
  children,
  disabled,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`min-h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors disabled:opacity-40 ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-accent/50 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function PillRow({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {children}
    </div>
  );
}

export function ActionButton({
  onClick,
  children,
  disabled,
  tone = "glass",
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: "glass" | "gold";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${tone === "gold" ? "btn-gold" : "btn-glass"} !min-h-10 !px-4 text-sm disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

/** A collapsible group, so long panels stay short on a phone. */
export function Group({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-xl border border-white/10 bg-white/[0.025]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-ink-subtle transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="space-y-4 px-4 pb-4">{children}</div>
    </details>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-ink-subtle">{children}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-ink-muted">{children}</p>;
}

export type Dispatch = (a: ProjectAction) => void;
export type TaskRunner = (
  label: string,
  job: (progress: (f: number) => void, cancelled: () => boolean, setLabel: (s: string) => void) => Promise<void>,
) => Promise<void>;

export interface PanelProps {
  project: Project;
  dispatch: Dispatch;
  engine: StudioEngine | null;
  sources: Source[];
  selection: Selection;
  setSelection: (s: Selection) => void;
  total: number;
  notify: (message: string) => void;
  run: TaskRunner;
  /** Opens the file chooser, then hands the chosen file to `onFile`. */
  pick: (accept: string, onFile: (file: File) => void) => void;
  /** Adds a file to the project's media and returns it. */
  addMedia: (file: File) => Promise<Source | null>;
  busy: boolean;
}
