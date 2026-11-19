"use client";

import { useState } from "react";
import { Check, Wand2 } from "lucide-react";
import { CAPTION_DOWNLOAD_NOTE, transcribe } from "@/lib/studio/ai";
import { formatTime } from "@/lib/studio/format";
import { newId } from "@/lib/studio/project";
import { cutPauses, reelStyles, type PauseCutResult, type ReelStyle } from "@/lib/studio/styles";
import type { CaptionStyle, Clip } from "@/lib/studio/types";
import type { Cut } from "@/lib/reel/edl";
import { analyseSpeech, type SilenceOptions } from "@/lib/reel/silence";
import { ActionButton, Group, Note, Pill, PillRow, type PanelProps } from "./ui";

const paces: { id: "natural" | "tight"; label: string; options: SilenceOptions }[] = [
  { id: "natural", label: "Natural", options: { minSilence: 0.4, padding: 0.12 } },
  { id: "tight", label: "Tight", options: { minSilence: 0.25, padding: 0.08 } },
];

/** A small sample word drawn the way each caption template looks. */
function Sample({ style, ink }: { style: CaptionStyle; ink: string }) {
  const base = "text-lg font-black uppercase leading-none tracking-tight";
  if (style === "box") return <span className={`${base} rounded bg-accent px-1.5 py-0.5`} style={{ color: ink }}>Value</span>;
  if (style === "serif") return <span className="font-serif text-xl italic leading-none" style={{ color: ink }}>Value</span>;
  if (style === "neon") return <span className={base} style={{ color: ink, textShadow: `0 0 10px ${ink}` }}>Value</span>;
  if (style === "karaoke")
    return (
      <span className={base}>
        <span className="text-white/50">Build </span>
        <span style={{ color: ink }}>Value</span>
      </span>
    );
  return <span className={base} style={{ color: ink, WebkitTextStroke: "1px rgba(0,0,0,.6)" }}>Value</span>;
}

function StyleCard({ style, active, onPick, disabled }: { style: ReelStyle; active: boolean; onPick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${style.name} style: ${style.vibe}`}
      disabled={disabled}
      onClick={onPick}
      className={`group relative min-w-0 overflow-hidden rounded-2xl border text-left transition-all disabled:opacity-50 ${
        active ? "border-accent ring-2 ring-accent/40" : "border-white/10 hover:border-accent/50"
      }`}
    >
      <span className="grid h-16 place-items-center" style={{ background: `linear-gradient(135deg, ${style.swatch[0]}, ${style.swatch[1]})` }}>
        <Sample style={style.caption} ink={style.ink} />
      </span>
      <span className="block px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {style.name}
          {active ? <Check size={14} className="text-accent" aria-label="applied" /> : null}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{style.vibe}</span>
      </span>
    </button>
  );
}

/** The fast lane: pick a look in one tap, or let the Studio do the whole edit. */
export function StylePanel({ project, dispatch, engine, run, notify, busy }: PanelProps) {
  const [pace, setPace] = useState<"natural" | "tight">("natural");
  const [steps, setSteps] = useState({ pauses: true, style: true, captions: true });
  const chosen = reelStyles.find((s) => s.id === project.styleId) ?? reelStyles[0];
  const [pick, setPick] = useState<string>(chosen.id);
  const autoStyle = reelStyles.find((s) => s.id === pick) ?? reelStyles[0];

  async function findPauses(clips: Clip[], label: (s: string) => void): Promise<PauseCutResult> {
    if (!engine) throw new Error("The editor is still loading.");
    const options = paces.find((p) => p.id === pace)!.options;
    const speech = new Map<string, Cut[] | null>();
    const ids = [...new Set(clips.map((c) => c.sourceId))];
    for (const [i, id] of ids.entries()) {
      label(ids.length > 1 ? `Listening for pauses (${i + 1} of ${ids.length})...` : "Listening for pauses...");
      try {
        speech.set(id, analyseSpeech(await engine.decodeAudio(id), options).cuts);
      } catch {
        speech.set(id, null);
      }
    }
    return cutPauses(clips, (id) => speech.get(id) ?? null, () => newId("clip"));
  }

  function describe(r: PauseCutResult): string {
    if (!r.removed) return "No pauses long enough to cut.";
    return `Cut ${r.removed} pause${r.removed === 1 ? "" : "s"}, ${formatTime(r.saved)} shorter.${r.skipped ? ` ${r.skipped} clip${r.skipped === 1 ? " was" : "s were"} left as is.` : ""}`;
  }

  function applyStyle(style: ReelStyle) {
    dispatch({ type: "applyStyle", style });
    setPick(style.id);
    notify(`${style.name} applied. Tap Undo to go back.`, "info");
  }

  async function cutOnly() {
    await run("Cutting the pauses...", async (_p, _c, label) => {
      const result = await findPauses(project.clips, label);
      if (result.removed) dispatch({ type: "setClips", clips: result.clips });
      notify(describe(result), "info");
    });
  }

  async function autoEdit() {
    if (!engine) return;
    await run("Editing your video...", async (progress, cancelled, label) => {
      const report: string[] = [];
      let clips = project.clips;
      if (steps.pauses) {
        const result = await findPauses(clips, label);
        if (result.removed) {
          clips = result.clips;
          dispatch({ type: "setClips", clips });
        }
        report.push(describe(result));
      }
      progress(0.3);
      if (cancelled()) return;
      if (steps.style) {
        dispatch({ type: "applyStyle", style: autoStyle });
        report.push(`${autoStyle.name} style applied.`);
      }
      progress(0.4);
      if (steps.captions && !cancelled()) {
        try {
          label("Reading the sound of your video...");
          // Captions must follow the new cuts, so the engine reads the clips we just made.
          engine.setProject({ ...project, clips });
          const samples = await engine.timelineSamples();
          if (!samples.some((v) => Math.abs(v) > 0.001)) throw new Error("no speech");
          const words = await transcribe(samples, label);
          if (!words.length) throw new Error("no speech");
          dispatch({ type: "setCaptions", words });
          report.push("Captions added.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          report.push(message === "no speech" ? "No speech was found to caption." : "Captions could not be made, but everything else is done.");
        }
      }
      progress(1);
      notify(report.join(" "), "info");
    });
  }

  const nothing = !steps.pauses && !steps.style && !steps.captions;

  return (
    <div className="space-y-4">
      <section aria-labelledby="auto-edit" className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.12] to-transparent p-4">
        <h3 id="auto-edit" className="flex items-center gap-2 text-base font-semibold">
          <Wand2 size={18} className="text-accent" aria-hidden="true" />
          Auto edit
        </h3>
        <p className="mt-1 text-xs text-ink-muted">One tap does the edit. You can change anything after, or tap Undo.</p>
        <div className="mt-3" />
        <PillRow label="Steps">
          <Pill active={steps.pauses} onClick={() => setSteps((s) => ({ ...s, pauses: !s.pauses }))}>Cut pauses</Pill>
          <Pill active={steps.style} onClick={() => setSteps((s) => ({ ...s, style: !s.style }))}>{autoStyle.name} style</Pill>
          <Pill active={steps.captions} onClick={() => setSteps((s) => ({ ...s, captions: !s.captions }))}>Captions (beta)</Pill>
        </PillRow>
        <div className="mt-3">
          <ActionButton tone="gold" onClick={autoEdit} disabled={busy || nothing || !project.clips.length}>
            <Wand2 size={16} aria-hidden="true" />
            Auto edit my video
          </ActionButton>
        </div>
        {steps.captions ? <p className="mt-2 text-[11px] text-ink-subtle">{CAPTION_DOWNLOAD_NOTE}</p> : null}
      </section>

      <Group title="Reel styles" open>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {reelStyles.map((s) => (
            <StyleCard key={s.id} style={s} active={project.styleId === s.id} disabled={busy} onPick={() => applyStyle(s)} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {project.styleId ? (
            <Pill onClick={() => dispatch({ type: "clearStyle" })}>Remove style</Pill>
          ) : null}
          <Note>A style sets captions, colour, transitions and punch-in zooms on every clip.</Note>
        </div>
      </Group>

      <Group title="Cut the pauses" open>
        <PillRow label="Pace">
          {paces.map((p) => (
            <Pill key={p.id} active={pace === p.id} onClick={() => setPace(p.id)}>
              {p.label}
            </Pill>
          ))}
        </PillRow>
        <div className="mt-3">
          <ActionButton onClick={cutOnly} disabled={busy || !project.clips.length}>
            Cut the pauses
          </ActionButton>
        </div>
        <Note>Natural keeps a breath between phrases. Tight is faster, for punchy Reels.</Note>
      </Group>
    </div>
  );
}
