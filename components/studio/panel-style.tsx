"use client";

import { useRef, useState } from "react";
import { Check, Circle, Download, Loader2, Minus, Play, SlidersHorizontal, Wand2, X } from "lucide-react";
import { CAPTION_DOWNLOAD_NOTE, transcribe } from "@/lib/studio/ai";
import { formatTime } from "@/lib/studio/format";
import { newId } from "@/lib/studio/project";
import { cutPauses, defaultRecipe, reelStyles, styleToRecipe, type PauseCutResult, type RecipePart, type ReelStyle } from "@/lib/studio/styles";
import { filterPresets, type CaptionStyle, type Clip, type Recipe, type SfxName, type TransitionType } from "@/lib/studio/types";
import type { Cut } from "@/lib/reel/edl";
import { analyseSpeech, type SilenceOptions } from "@/lib/reel/silence";
import { ActionButton, Group, Note, Pill, PillRow, type PanelProps } from "./ui";

// ---- the menu ----

const paces: { id: Recipe["pace"]; label: string; options?: SilenceOptions }[] = [
  { id: "off", label: "Off" },
  { id: "natural", label: "Natural", options: { minSilence: 0.4, padding: 0.12 } },
  { id: "tight", label: "Tight", options: { minSilence: 0.25, padding: 0.08 } },
];
const captionChoices: { id: CaptionStyle | "off"; label: string }[] = [
  { id: "off", label: "No captions" },
  { id: "gold", label: "Gold" },
  { id: "pop", label: "Pop in" },
  { id: "karaoke", label: "Karaoke" },
  { id: "bounce", label: "Bounce" },
  { id: "box", label: "Box" },
  { id: "typewriter", label: "Typewriter" },
  { id: "neon", label: "Neon" },
  { id: "slide", label: "Slide up" },
  { id: "wave", label: "Wave" },
  { id: "serif", label: "Serif" },
];
const transitionChoices: { id: TransitionType; label: string }[] = [
  { id: "none", label: "Hard cuts" },
  { id: "fade", label: "Fade" },
  { id: "zoom", label: "Zoom" },
  { id: "flash", label: "Flash" },
  { id: "slide", label: "Slide" },
  { id: "slideUp", label: "Rise" },
  { id: "wipe", label: "Wipe" },
  { id: "wipeDown", label: "Drop wipe" },
  { id: "spin", label: "Spin" },
  { id: "shake", label: "Shake" },
];
const lengths = [
  { value: 0.3, label: "Quick" },
  { value: 0.5, label: "Smooth" },
  { value: 0.8, label: "Slow" },
];
const cutSounds: { id: SfxName | "none"; label: string }[] = [
  { id: "none", label: "No sound" },
  { id: "whoosh", label: "Whoosh" },
  { id: "swipe", label: "Swipe" },
  { id: "hit", label: "Hit" },
  { id: "glitch", label: "Glitch" },
  { id: "pop", label: "Pop" },
  { id: "riser", label: "Riser" },
];
const captionSounds: { id: SfxName | "none"; label: string }[] = [
  { id: "none", label: "No sound" },
  { id: "pop", label: "Pop" },
  { id: "click", label: "Click" },
  { id: "ding", label: "Ding" },
  { id: "sparkle", label: "Sparkle" },
];
const motions: { id: Recipe["motion"]; label: string; note: string }[] = [
  { id: "none", label: "Still", note: "No added movement." },
  { id: "punch", label: "Punch-in zooms", note: "Every other clip is zoomed in a little. Keeps talking heads lively." },
  { id: "push", label: "Slow push-in", note: "Each clip slowly zooms in, using keyframes." },
  { id: "drift", label: "Drift", note: "Each clip glides gently sideways, using keyframes." },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none";

// ---- the steps you watch ----

type StepId = "pauses" | RecipePart;
type StepStatus = "wait" | "doing" | "done" | "skip" | "fail";
interface Step {
  id: StepId;
  label: string;
  status: StepStatus;
  note?: string;
}

const stepLabels: Record<StepId, string> = {
  pauses: "Cutting the pauses",
  look: "Setting the look",
  transitions: "Adding transitions and sounds",
  motion: "Adding motion",
  overlays: "Placing overlays",
  captions: "Writing captions",
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "doing") return <Loader2 size={16} className="animate-spin text-accent" aria-hidden="true" />;
  if (status === "done") return <Check size={16} className="text-accent" aria-hidden="true" />;
  if (status === "skip") return <Minus size={16} className="text-ink-subtle" aria-hidden="true" />;
  if (status === "fail") return <X size={16} className="text-red-300" aria-hidden="true" />;
  return <Circle size={14} className="text-ink-subtle" aria-hidden="true" />;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A small sample word drawn the way each caption template looks. */
function Sample({ style, ink }: { style: CaptionStyle; ink: string }) {
  const base = "text-base font-black uppercase leading-none tracking-tight";
  if (style === "box") return <span className={`${base} rounded bg-accent px-1.5 py-0.5`} style={{ color: ink }}>Value</span>;
  if (style === "serif") return <span className="font-serif text-lg italic leading-none" style={{ color: ink }}>Value</span>;
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
      className={`w-36 shrink-0 overflow-hidden rounded-2xl border text-left transition-all disabled:opacity-50 sm:w-auto ${
        active ? "border-accent ring-2 ring-accent/40" : "border-white/10 hover:border-accent/50"
      }`}
    >
      <span className="grid h-14 place-items-center" style={{ background: `linear-gradient(135deg, ${style.swatch[0]}, ${style.swatch[1]})` }}>
        <Sample style={style.caption} ink={style.ink} />
      </span>
      <span className="block px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {style.name}
          {active ? <Check size={14} className="text-accent" aria-hidden="true" /> : null}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{style.vibe}</span>
      </span>
    </button>
  );
}

/**
 * The edit builder: choose what you want, tap once, watch the Studio make the edit,
 * then play it, retouch it in the other tabs, or export it.
 */
export function StylePanel({
  project,
  dispatch,
  engine,
  run,
  notify,
  busy,
  onRetouch,
  onExport,
}: PanelProps & { onRetouch: () => void; onExport: () => void }) {
  const [recipe, setRecipe] = useState<Recipe>(() => defaultRecipe(project));
  const [styleId, setStyleId] = useState<string | null>(project.recipe ? project.styleId : reelStyles[0].id);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [phase, setPhase] = useState<"build" | "working" | "done">("build");
  const top = useRef<HTMLDivElement>(null);
  // The button can be far down the page, so bring the progress and the preview back into view.
  const toTop = () => requestAnimationFrame(() => top.current?.scrollIntoView({ block: "start", behavior: "smooth" }));

  const change = (patch: Partial<Recipe>) => {
    setRecipe((r) => ({ ...r, ...patch }));
    setStyleId(null);
  };
  const startStyle = reelStyles.find((s) => s.id === styleId);

  async function findPauses(clips: Clip[], options: SilenceOptions, label: (s: string) => void): Promise<PauseCutResult> {
    if (!engine) throw new Error("The editor is still loading.");
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

  async function make() {
    if (!engine) return;
    const r = recipe;
    const order: StepId[] = ["pauses", "look", "transitions", "motion", "overlays", "captions"];
    let list: Step[] = order.map((id) => ({ id, label: stepLabels[id], status: "wait" }));
    const set = (id: StepId, status: StepStatus, note?: string) => {
      list = list.map((s) => (s.id === id ? { ...s, status, note } : s));
      setSteps(list);
    };
    setSteps(list);
    setPhase("working");
    toTop();
    engine.pause();

    await run("Making your video...", async (progress, cancelled, label) => {
      let clips = project.clips;
      let clipsChanged = false;

      // 1. quick cuts
      if (r.pace === "off") set("pauses", "skip", "Off");
      else {
        set("pauses", "doing");
        const result = await findPauses(clips, paces.find((p) => p.id === r.pace)!.options!, label);
        if (result.removed) {
          clips = result.clips;
          clipsChanged = true;
          dispatch({ type: "setClips", clips });
          set("pauses", "done", `${result.removed} pause${result.removed === 1 ? "" : "s"} cut, ${formatTime(result.saved)} shorter`);
        } else set("pauses", "done", "No long pauses found");
      }
      progress(0.15);

      // 2-5. the look, transitions, motion and overlays, one at a time so you can see each land
      const parts: { id: RecipePart; note: string }[] = [
        { id: "look", note: filterPresets.find((f) => f.id === r.look)?.label ?? "Original" },
        {
          id: "transitions",
          note:
            r.transition === "none"
              ? "Hard cuts"
              : `${transitionChoices.find((t) => t.id === r.transition)?.label}${r.transitionSfx !== "none" ? ` with ${r.transitionSfx}` : ""}`,
        },
        { id: "motion", note: motions.find((m) => m.id === r.motion)?.label ?? "Still" },
        {
          id: "overlays",
          note: [r.watermark && "Watermark", r.lowerThird.on && "Lower third", r.banner.on && "Banner"].filter(Boolean).join(", ") || "None",
        },
      ];
      for (const [i, part] of parts.entries()) {
        if (cancelled()) return;
        set(part.id, "doing");
        label(`${stepLabels[part.id]}...`);
        await wait(450);
        dispatch({ type: "applyRecipePart", recipe: r, part: part.id, styleId: i === 0 ? styleId : undefined });
        set(part.id, "done", part.note);
        progress(0.15 + (i + 1) * 0.1);
      }

      // 6. captions: made again only when needed, because it is the slow step
      if (cancelled()) return;
      if (r.caption === "off") {
        dispatch({ type: "applyRecipePart", recipe: r, part: "captions" });
        set("captions", "skip", "Off");
      } else if (project.captions.length && !clipsChanged) {
        dispatch({ type: "applyRecipePart", recipe: r, part: "captions" });
        set("captions", "done", "Restyled your captions");
      } else {
        set("captions", "doing");
        try {
          label("Reading the sound of your video...");
          // Captions must follow the new cuts, so the engine reads the clips just made.
          engine.setProject({ ...project, clips });
          const samples = await engine.timelineSamples();
          if (!samples.some((v) => Math.abs(v) > 0.001)) throw new Error("no speech");
          const words = await transcribe(samples, label);
          if (!words.length) throw new Error("no speech");
          dispatch({ type: "setCaptions", words });
          dispatch({ type: "applyRecipePart", recipe: r, part: "captions" });
          set("captions", "done", `${words.length} words`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          set("captions", "fail", message === "no speech" ? "No speech found" : "Could not be made on this device");
        }
      }
      progress(1);
      await wait(250);
      setPhase("done");
      engine.seek(0);
      void engine.play();
    });
    // If the run stopped early (cancelled or an error), go back to the choices.
    setPhase((p) => (p === "working" ? "build" : p));
  }

  // ---- working and done ----

  if (phase !== "build" && steps) {
    const done = phase === "done";
    return (
      <div ref={top} className="scroll-mt-[60vh] space-y-4 lg:scroll-mt-24">
        <section aria-live="polite" className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.12] to-transparent p-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Wand2 size={18} className="text-accent" aria-hidden="true" />
            {done ? "Your video is ready" : "Making your video..."}
          </h3>
          <ol className="mt-3 space-y-2">
            {steps.map((s) => (
              <li key={s.id} className={`flex items-start gap-3 text-sm ${s.status === "wait" ? "text-ink-subtle" : "text-ink"}`}>
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center">
                  <StepIcon status={s.status} />
                </span>
                <span className="min-w-0">
                  {s.label}
                  {s.note ? <span className="block text-xs text-ink-muted">{s.note}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {done ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                onClick={() => {
                  engine?.seek(0);
                  void engine?.play();
                }}
              >
                <Play size={16} aria-hidden="true" />
                Play it
              </ActionButton>
              <ActionButton tone="gold" onClick={onExport} disabled={busy}>
                <Download size={16} aria-hidden="true" />
                Export
              </ActionButton>
              <ActionButton onClick={onRetouch}>
                <SlidersHorizontal size={16} aria-hidden="true" />
                Retouch
              </ActionButton>
              <ActionButton
                onClick={() => {
                  setPhase("build");
                  toTop();
                }}
              >
                Change choices
              </ActionButton>
            </div>
            <Note>Retouch opens the other tabs, where you can change any clip, caption or overlay. Undo takes back the whole edit step by step.</Note>
          </div>
        ) : null}
      </div>
    );
  }

  // ---- the builder ----

  const makeButton = (
    <ActionButton tone="gold" onClick={make} disabled={busy || !project.clips.length}>
      <Wand2 size={16} aria-hidden="true" />
      Make my video
    </ActionButton>
  );

  return (
    <div ref={top} className="scroll-mt-[60vh] space-y-4 lg:scroll-mt-24">
      <section aria-labelledby="builder-title" className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.12] to-transparent p-4">
        <h3 id="builder-title" className="flex items-center gap-2 text-base font-semibold">
          <Wand2 size={18} className="text-accent" aria-hidden="true" />
          Build my edit
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          Start from a style, change anything below, then tap Make my video. You can retouch everything afterwards.
        </p>
        <div className="-mx-1 mt-3 flex gap-2.5 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {reelStyles.map((s) => (
            <StyleCard
              key={s.id}
              style={s}
              active={styleId === s.id}
              disabled={busy}
              onPick={() => {
                setRecipe((r) => styleToRecipe(s, r));
                setStyleId(s.id);
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-subtle">{startStyle ? `Starting from ${startStyle.name}.` : "Custom mix."}</p>
        <div className="mt-3">{makeButton}</div>
      </section>

      <Group title="Quick cuts" open>
        <PillRow label="Cut the pauses">
          {paces.map((p) => (
            <Pill key={p.id} active={recipe.pace === p.id} onClick={() => change({ pace: p.id })}>
              {p.label}
            </Pill>
          ))}
        </PillRow>
        <Note>Removes the silent gaps between your sentences. Natural keeps a breath; Tight is faster.</Note>
      </Group>

      <Group title="Look" open>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {filterPresets.map((f) => (
            <Pill key={f.id} active={recipe.look === f.id} onClick={() => change({ look: f.id })}>
              {f.label}
            </Pill>
          ))}
        </div>
      </Group>

      <Group title="Captions">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {captionChoices.map((c) => (
            <Pill key={c.id} active={recipe.caption === c.id} onClick={() => change({ caption: c.id })}>
              {c.label}
            </Pill>
          ))}
        </div>
        {recipe.caption !== "off" ? (
          <div className="mt-3 space-y-2">
            <PillRow label="Sound on each caption line">
              {captionSounds.map((s) => (
                <Pill key={s.id} active={recipe.captionSfx === s.id} onClick={() => change({ captionSfx: s.id })}>
                  {s.label}
                </Pill>
              ))}
            </PillRow>
            <Note>Captions are in beta and English only. {CAPTION_DOWNLOAD_NOTE}</Note>
          </div>
        ) : null}
      </Group>

      <Group title="Transitions and sound">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {transitionChoices.map((t) => (
            <Pill key={t.id} active={recipe.transition === t.id} onClick={() => change({ transition: t.id })}>
              {t.label}
            </Pill>
          ))}
        </div>
        {recipe.transition !== "none" ? (
          <div className="mt-3 space-y-3">
            <PillRow label="Transition length">
              {lengths.map((l) => (
                <Pill key={l.value} active={recipe.transitionDuration === l.value} onClick={() => change({ transitionDuration: l.value })}>
                  {l.label}
                </Pill>
              ))}
            </PillRow>
            <PillRow label="Sound on each transition">
              {cutSounds.map((s) => (
                <Pill key={s.id} active={recipe.transitionSfx === s.id} onClick={() => change({ transitionSfx: s.id })}>
                  {s.label}
                </Pill>
              ))}
            </PillRow>
          </div>
        ) : null}
        <Note>Transitions go between your separate clips. The pause cuts inside one recording stay as clean jump cuts.</Note>
      </Group>

      <Group title="Motion">
        <PillRow label="Motion">
          {motions.map((m) => (
            <Pill key={m.id} active={recipe.motion === m.id} onClick={() => change({ motion: m.id })}>
              {m.label}
            </Pill>
          ))}
        </PillRow>
        <Note>{motions.find((m) => m.id === recipe.motion)?.note}</Note>
      </Group>

      <Group title="Overlays">
        <div className="space-y-3">
          <PillRow label="Overlays">
            <Pill active={recipe.watermark} onClick={() => change({ watermark: !recipe.watermark })}>
              Watermark
            </Pill>
            <Pill active={recipe.lowerThird.on} onClick={() => change({ lowerThird: { ...recipe.lowerThird, on: !recipe.lowerThird.on } })}>
              Name and title
            </Pill>
            <Pill active={recipe.banner.on} onClick={() => change({ banner: { ...recipe.banner, on: !recipe.banner.on } })}>
              Banner
            </Pill>
          </PillRow>
          {recipe.lowerThird.on ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                aria-label="Name"
                placeholder="Your name"
                value={recipe.lowerThird.title}
                onChange={(e) => change({ lowerThird: { ...recipe.lowerThird, title: e.target.value } })}
                className={inputClass}
              />
              <input
                aria-label="Title"
                placeholder="What you do"
                value={recipe.lowerThird.subtitle}
                onChange={(e) => change({ lowerThird: { ...recipe.lowerThird, subtitle: e.target.value } })}
                className={inputClass}
              />
            </div>
          ) : null}
          {recipe.banner.on ? (
            <input
              aria-label="Banner text"
              placeholder="Banner text"
              value={recipe.banner.text}
              onChange={(e) => change({ banner: { ...recipe.banner, text: e.target.value } })}
              className={inputClass}
            />
          ) : null}
        </div>
      </Group>

      <div className="flex flex-wrap items-center gap-3">
        {makeButton}
        {project.styleId || project.recipe ? (
          <Pill
            onClick={() => {
              dispatch({ type: "clearStyle" });
              notify("Look, transitions and punch-ins removed. Your cuts and captions stay.", "info");
            }}
          >
            Remove the look
          </Pill>
        ) : null}
      </div>
    </div>
  );
}
