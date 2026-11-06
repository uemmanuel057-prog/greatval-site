import type { ReactNode } from "react";

/** Small form primitives shared by the generator panels. */

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-ink placeholder:text-ink-subtle focus-visible:outline-2 focus-visible:outline-accent";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="eyebrow">
          {label}
        </label>
        {hint ? <span className="font-mono text-xs text-ink-subtle">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-accent/50 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Two or three option toggle. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.id} active={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
