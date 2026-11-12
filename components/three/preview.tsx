"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/container";
import { assessDevice, type DeviceReport } from "@/lib/three/capability";
import type { SceneKind } from "@/lib/three/scenes";
import { Hero3D, type Force, type Hero3DStatus } from "./hero-3d";

const options: { id: SceneKind; title: string; note: string }[] = [
  { id: "bricks", title: "Gold bricks", note: "Lays itself brick by brick. Tap it to replay. Ties to One Brick at a Time." },
  { id: "monogram", title: "GV monogram", note: "A gold GV that turns with your finger or cursor." },
  { id: "phone", title: "Video Studio phone", note: "Shows the Studio running. Good for promoting the tool." },
];

const forces: { id: Force; label: string }[] = [
  { id: "auto", label: "Auto (what visitors get)" },
  { id: "on", label: "Force 3D" },
  { id: "off", label: "Force flat" },
];

export function ThreePreview() {
  const [force, setForce] = useState<Force>("auto");
  const [report, setReport] = useState<DeviceReport | null>(null);
  const [status, setStatus] = useState<Partial<Record<SceneKind, Hero3DStatus>>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReport(assessDevice());
  }, []);

  return (
    <section className="py-8 sm:py-12">
      <Container>
        <h1 className="text-3xl font-bold sm:text-4xl">3D preview</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">
          Three centrepiece options for the homepage. Open this page on your phone to see what it would get.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">This device</p>
          {report ? (
            <>
              <p className="mt-2 text-sm">
                {report.ok ? "Would get 3D." : <>Would get the flat version: <span className="text-ink-muted">{report.reasons.join(". ")}.</span></>}
              </p>
              <ul className="mt-2 grid gap-x-6 gap-y-1 text-xs text-ink-muted sm:grid-cols-2">
                {report.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Checking...</p>
          )}
          <div role="group" aria-label="Test mode" className="mt-4 flex flex-wrap gap-2">
            {forces.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={force === f.id}
                onClick={() => setForce(f.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${force === f.id ? "border-accent bg-accent/15 text-accent" : "border-white/10 text-ink-muted hover:border-white/30"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {options.map((o) => (
            <article key={o.id} className="min-w-0 rounded-3xl border border-white/10 bg-raised p-4">
              <Hero3D kind={o.id} force={force} onStatus={(s) => setStatus((prev) => ({ ...prev, [o.id]: s }))} className="bg-black/30" />
              <h2 className="mt-4 text-lg font-semibold">{o.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{o.note}</p>
              <p className="mt-3 font-mono text-xs text-ink-subtle" aria-live="polite">
                {status[o.id]?.mode === "3d" ? `3D running${status[o.id]?.fps ? ` · ${status[o.id]?.fps} fps` : ""}` : status[o.id]?.mode === "flat" ? `Flat: ${status[o.id]?.reason}` : "Starting..."}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
