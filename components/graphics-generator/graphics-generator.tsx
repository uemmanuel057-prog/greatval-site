"use client";

import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ratios } from "@/lib/graphics/brand";
import { monthNames } from "@/lib/graphics/month";
import { spotlightPresets } from "@/lib/graphics/spotlights";
import {
  buildGraphicQuery,
  defaultParams,
  portraitOptions,
  type GraphicMode,
  type GraphicParams,
} from "@/lib/graphics/params";
import { Chip, Field, Segmented, inputClass } from "./controls";
import { GraphicPreview } from "./preview";
import { QuoteLibrary } from "./quote-library";

const modes: { id: GraphicMode; label: string }[] = [
  { id: "quote", label: "Daily Execution Quote" },
  { id: "month", label: "Happy New Month" },
  { id: "spotlight", label: "Service Spotlight" },
];

/** Services offered as one-tap choices in the New Month list. */
const serviceChoices = [
  "Meta & Google Ads",
  "Multi-Cam Broadcasting",
  "Web & Tech Solutions",
  "Copywriting",
  "Brand Consulting",
  "Video Editing & Motion Graphics",
  "Event Planning & Management",
  "Automation & Tech Solutions",
];

const ctaIdeas = ["Contact me", "Let's work together", "DM me to get started"];
const MAX_SERVICES = 6;

export function GraphicsGenerator() {
  const [params, setParams] = useState<GraphicParams>(defaultParams);
  const [selectedQuote, setSelectedQuote] = useState<number | null>(null);
  const [customService, setCustomService] = useState("");
  const [presetId, setPresetId] = useState<string>("web");
  const [busy, setBusy] = useState<1 | 2 | null>(null);
  const [error, setError] = useState("");

  const set = <K extends keyof GraphicParams>(key: K, value: GraphicParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const previewQuery = useMemo(() => buildGraphicQuery({ ...params, scale: 1 }), [params]);

  function toggleService(name: string) {
    setParams((prev) => {
      const has = prev.services.includes(name);
      if (has) return { ...prev, services: prev.services.filter((s) => s !== name) };
      if (prev.services.length >= MAX_SERVICES) return prev;
      return { ...prev, services: [...prev.services, name] };
    });
  }

  function addCustomService() {
    const name = customService.trim().slice(0, 40);
    if (!name) return;
    toggleServiceOn(name);
    setCustomService("");
  }

  function toggleServiceOn(name: string) {
    setParams((prev) =>
      prev.services.includes(name) || prev.services.length >= MAX_SERVICES
        ? prev
        : { ...prev, services: [...prev.services, name] },
    );
  }

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = spotlightPresets.find((p) => p.id === id);
    if (!preset) return;
    setParams((prev) => ({ ...prev, headline: preset.headline, body: preset.body, cta: preset.cta }));
  }

  async function download(scale: 1 | 2) {
    setBusy(scale);
    setError("");
    try {
      const res = await fetch(`/api/admin/graphics?${buildGraphicQuery({ ...params, scale })}`);
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `great-val-${params.mode}-${params.ratio}${scale === 2 ? "-2x" : ""}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed. Reload the page and log in again if this keeps happening.");
    }
    setBusy(null);
  }

  const size = ratios[params.ratio];

  return (
    <section aria-labelledby="graphics-title" className="py-10 sm:py-14">
      <Container>
        <h1 id="graphics-title" className="text-3xl font-bold sm:text-4xl">
          Graphics Generator
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          On-brand social graphics. Pick a mode, edit the words, and download a PNG.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
          {/* Preview comes first on small screens, then sticks beside the controls. */}
          <div className="lg:order-2 lg:sticky lg:top-24">
            <GraphicPreview query={previewQuery} ratio={params.ratio} />
            <p className="mt-3 font-mono text-xs text-ink-subtle">
              Preview. Downloads are {size.width}×{size.height}px, or double that in high-res.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => download(2)} disabled={busy !== null} className="btn-gold disabled:opacity-60">
                <Download size={18} aria-hidden="true" />
                {busy === 2 ? "Rendering..." : "Download High-Res PNG"}
              </button>
              <button type="button" onClick={() => download(1)} disabled={busy !== null} className="btn-glass disabled:opacity-60">
                {busy === 1 ? "Rendering..." : `Standard ${size.width}×${size.height}`}
              </button>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {error}
              </p>
            ) : null}
          </div>

          <div className="space-y-8 lg:order-1">
            <Field label="Mode">
              <Segmented value={params.mode} options={modes} onChange={(m) => set("mode", m)} label="Graphic mode" />
            </Field>

            {params.mode === "quote" ? (
              <div className="card space-y-6">
                <Field label="Message" htmlFor="quote" hint={`${params.quote.length}/300`}>
                  <textarea
                    id="quote"
                    rows={4}
                    maxLength={300}
                    value={params.quote}
                    onChange={(e) => set("quote", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Signature line" htmlFor="author" hint="Leave empty to hide">
                  <input id="author" maxLength={40} value={params.author} onChange={(e) => set("author", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Quote library">
                  <QuoteLibrary
                    current={params.quote}
                    selected={selectedQuote}
                    onSelect={(index, text) => {
                      setSelectedQuote(index);
                      set("quote", text);
                    }}
                  />
                </Field>
              </div>
            ) : null}

            {params.mode === "month" ? (
              <div className="card space-y-6">
                <Field label="Month" htmlFor="month">
                  <select id="month" value={params.month} onChange={(e) => set("month", e.target.value)} className={inputClass}>
                    <option value="">Auto (from today&apos;s date, Lagos time)</option>
                    {monthNames.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Services to list" hint={`${params.services.length}/${MAX_SERVICES}`}>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([...serviceChoices, ...params.services])).map((name) => (
                      <Chip key={name} active={params.services.includes(name)} onClick={() => toggleService(name)}>
                        {name}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      aria-label="Add your own service"
                      placeholder="Add your own"
                      maxLength={40}
                      value={customService}
                      onChange={(e) => setCustomService(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomService();
                        }
                      }}
                      className={inputClass}
                    />
                    <button type="button" onClick={addCustomService} aria-label="Add service" className="btn-glass shrink-0 !px-4">
                      <Plus size={18} aria-hidden="true" />
                    </button>
                  </div>
                </Field>
              </div>
            ) : null}

            {params.mode === "spotlight" ? (
              <div className="card space-y-6">
                <Field label="Spotlight a skill">
                  <div className="flex flex-wrap gap-2">
                    {spotlightPresets.map((preset) => (
                      <Chip key={preset.id} active={presetId === preset.id} onClick={() => applyPreset(preset.id)}>
                        {preset.label}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-subtle">A preset fills the fields below. Every field stays editable.</p>
                </Field>
                <Field label="Small label" htmlFor="eyebrow" hint="Leave empty to hide">
                  <input id="eyebrow" maxLength={32} value={params.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Headline" htmlFor="headline" hint={`${params.headline.length}/80`}>
                  <input id="headline" maxLength={80} value={params.headline} onChange={(e) => set("headline", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Supporting line" htmlFor="body" hint={`${params.body.length}/220`}>
                  <textarea id="body" rows={3} maxLength={220} value={params.body} onChange={(e) => set("body", e.target.value)} className={inputClass} />
                </Field>
              </div>
            ) : null}

            <div className="card space-y-6">
              <Field label="Call to action" htmlFor="cta" hint="Leave empty to hide">
                <input id="cta" maxLength={60} placeholder="e.g. Need a website? Contact me" value={params.cta} onChange={(e) => set("cta", e.target.value)} className={inputClass} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {ctaIdeas.map((idea) => (
                    <Chip key={idea} active={params.cta === idea} onClick={() => set("cta", idea)}>
                      {idea}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="Shape">
                <Segmented
                  value={params.ratio}
                  options={[
                    { id: "square", label: ratios.square.label },
                    { id: "wide", label: ratios.wide.label },
                  ]}
                  onChange={(r) => set("ratio", r)}
                  label="Aspect ratio"
                />
              </Field>

              <Field label="Portrait">
                <div className="flex flex-wrap gap-2">
                  <Chip active={params.portrait} onClick={() => set("portrait", !params.portrait)}>
                    {params.portrait ? "Portrait on" : "Portrait off"}
                  </Chip>
                  {params.portrait
                    ? portraitOptions.map((o) => (
                        <Chip key={o.id} active={params.portraitId === o.id} onClick={() => set("portraitId", o.id)}>
                          {o.label}
                        </Chip>
                      ))
                    : null}
                </div>
              </Field>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
