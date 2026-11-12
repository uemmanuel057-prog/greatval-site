"use client";

import { useEffect, useRef, useState } from "react";
import { assessDevice } from "@/lib/three/capability";
import type { SceneHandle, SceneKind } from "@/lib/three/scenes";

export type Force = "auto" | "on" | "off";
export interface Hero3DStatus {
  mode: "checking" | "3d" | "flat";
  reason: string;
  fps?: number;
}

const labels: Record<SceneKind, string> = {
  bricks: "Gold bricks stacking into a wall",
  phone: "A phone showing the GREAT VAL video studio",
};

/** What everyone sees first, and what devices that cannot handle 3D keep. Pure markup, no scripts. */
function Flat({ kind }: { kind: SceneKind }) {
  if (kind === "bricks") {
    const rows = [3, 2, 3, 2];
    return (
      <div className="flex h-full flex-col-reverse items-center justify-center gap-1.5" aria-hidden="true">
        {rows.map((n, r) => (
          <div key={r} className="flex gap-1.5">
            {Array.from({ length: n }, (_, i) => (
              <span
                key={i}
                className={`h-9 w-[4.4rem] rounded-md bg-gradient-to-b from-[#f2c261] to-[#c98a1c] shadow-[0_6px_14px_rgba(0,0,0,.45)] sm:h-11 sm:w-24 ${
                  r === 3 && i === n - 1 ? "ring-2 ring-accent/70" : ""
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid h-full place-items-center" aria-hidden="true">
      <div className="h-64 w-32 rounded-[2rem] border-4 border-[#1a1e27] bg-[#0B0F17] p-3 shadow-2xl sm:h-72 sm:w-36">
        <p className="font-mono text-[10px] font-bold text-accent">VAL STUDIO</p>
        <div className="mt-2 h-24 rounded-xl bg-gradient-to-br from-[#2a1c05] to-[#0f2a33]" />
        <div className="mt-3 space-y-1.5">
          <div className="h-2.5 w-3/4 rounded bg-accent/80" />
          <div className="h-2.5 w-1/2 rounded bg-code/70" />
          <div className="h-2.5 w-2/3 rounded bg-white/25" />
        </div>
      </div>
    </div>
  );
}

/**
 * A 3D centrepiece that only loads on a capable device and connection.
 * The flat picture is always there first, so nothing jumps and slow devices lose nothing.
 */
export function Hero3D({
  kind,
  force = "auto",
  onStatus,
  className = "",
}: {
  kind: SceneKind;
  force?: Force;
  onStatus?: (s: Hero3DStatus) => void;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"checking" | "3d" | "flat">("checking");
  const report = useRef(onStatus);
  useEffect(() => {
    report.current = onStatus;
  });

  useEffect(() => {
    let handle: SceneHandle | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const say = (s: Hero3DStatus) => {
      setMode(s.mode);
      report.current?.(s);
    };

    if (force === "off") {
      say({ mode: "flat", reason: "Switched off for testing" });
      return;
    }
    const device = assessDevice();
    const glOk = device.facts.some((f) => f.startsWith("3D graphics: supported"));
    if (force === "auto" && !device.ok) {
      say({ mode: "flat", reason: device.reasons.join(". ") });
      return;
    }
    if (!glOk) {
      say({ mode: "flat", reason: "3D graphics are not available" });
      return;
    }

    // Wait until the page has settled so 3D never competes with the text and images.
    const start = async () => {
      if (cancelled || !canvas.current) return;
      try {
        const { createScene } = await import("@/lib/three/scenes");
        if (cancelled || !canvas.current) return;
        handle = createScene(kind, canvas.current, {
          onSlow: (fps) => {
            // "Force 3D" is for testing, so it never gives up.
            if (force === "on") return;
            handle?.dispose();
            handle = null;
            say({ mode: "flat", reason: `It ran at ${fps} frames per second, so the flat version is shown`, fps });
          },
          onFps: (fps) => report.current?.({ mode: "3d", reason: "3D is running", fps }),
        });
        say({ mode: "3d", reason: "3D is running" });
      } catch {
        say({ mode: "flat", reason: "3D could not start on this device" });
      }
    };
    const run = () => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(() => void start(), { timeout: 2500 });
      else timer = setTimeout(() => void start(), 600);
    };
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("load", run);
      handle?.dispose();
    };
  }, [kind, force]);

  return (
    <div role="img" aria-label={labels[kind]} className={`relative aspect-[5/4] w-full overflow-hidden rounded-3xl ${className}`}>
      <div className={`absolute inset-0 transition-opacity duration-700 ${mode === "3d" ? "opacity-0" : "opacity-100"}`}>
        <Flat kind={kind} />
      </div>
      <canvas ref={canvas} aria-hidden="true" className={`absolute inset-0 size-full touch-pan-y transition-opacity duration-700 ${mode === "3d" ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
