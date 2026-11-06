import type { ReactNode } from "react";

/**
 * Wraps a standalone page: soft gold glow and a faint grid behind the content.
 * Sections inside provide their own container, so none is added here.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_at_50%_0%,rgb(229_169_60/0.14),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
      />
      {children}
    </div>
  );
}
