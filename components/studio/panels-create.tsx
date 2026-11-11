"use client";

import { ImagePlus, Trash2, Video } from "lucide-react";
import { inputClass } from "@/components/graphics-generator/controls";
import { CAPTION_DOWNLOAD_NOTE, transcribe } from "@/lib/studio/ai";
import { formatTime } from "@/lib/studio/format";
import { newId } from "@/lib/studio/project";
import { captionLines } from "@/lib/studio/render";
import {
  baseTransform,
  noMask,
  ratios,
  type BackgroundKind,
  type CaptionStyle,
  type CaptionWord,
  type OverlayLayer,
  type QualityId,
  type RatioId,
  type SfxName,
  type TextColor,
  type TextLayer,
  type TextPosition,
  type TextSize,
} from "@/lib/studio/types";
import { MaskEditor, TransformEditor } from "./panels-edit";
import { ActionButton, Empty, Group, Note, Pill, PillRow, Slider, type PanelProps } from "./ui";

// ---- Text and captions ----

const captionStyles: { id: CaptionStyle; label: string }[] = [
  { id: "gold", label: "GREAT VAL Gold" },
  { id: "box", label: "Box" },
  { id: "serif", label: "Serif" },
];
const sfxChoices: { id: SfxName | "none"; label: string }[] = [
  { id: "none", label: "None" },
  { id: "whoosh", label: "Whoosh" },
  { id: "pop", label: "Pop" },
  { id: "boom", label: "Boom" },
  { id: "shutter", label: "Shutter" },
];

export function TextPanel({
  project,
  dispatch,
  engine,
  run,
  total,
  layer,
  onAddText,
  onTrack,
}: PanelProps & { layer?: TextLayer; onAddText: () => void; onTrack: (target: { kind: "text" | "layer"; id: string }) => void }) {
  const patch = (p: Partial<TextLayer>) => layer && dispatch({ type: "updateText", id: layer.id, patch: p });
  const lines = captionLines(project.captions);

  async function generate() {
    if (!engine) return;
    await run("Preparing captions...", async (_p, _c, label) => {
      label("Reading the sound of your video...");
      const samples = await engine.timelineSamples();
      if (!samples.some((v) => Math.abs(v) > 0.001)) throw new Error("There is no speech in this video to caption.");
      const words = await transcribe(samples, label);
      if (!words.length) throw new Error("No speech was found to caption.");
      dispatch({ type: "setCaptions", words });
    });
  }

  function editLine(index: number, text: string) {
    const line = lines[index];
    const start = line[0].start;
    const end = line[line.length - 1].end;
    const parts = text.split(/\s+/).filter(Boolean);
    const step = (end - start) / Math.max(parts.length, 1);
    const words: CaptionWord[] = parts.map((w, i) => ({ text: w, start: start + i * step, end: start + (i + 1) * step }));
    dispatch({ type: "setCaptions", words: lines.flatMap((l, i) => (i === index ? words : l)) });
  }

  return (
    <div className="space-y-4">
      <Group title="Text" open>
        <ActionButton onClick={onAddText} disabled={!project.clips.length}>
          Add text at the playhead
        </ActionButton>
        {layer ? (
          <div className="space-y-4">
            <textarea aria-label="Text" value={layer.text} rows={2} onChange={(e) => patch({ text: e.target.value })} className={inputClass} />
            <Slider label="Starts" value={Number(layer.start.toFixed(1))} min={0} max={Math.max(total, 1)} step={0.1} format={formatTime} onChange={(v) => patch({ start: Math.min(v, layer.end - 0.2) })} />
            <Slider label="Ends" value={Number(layer.end.toFixed(1))} min={0} max={Math.max(total, 1)} step={0.1} format={formatTime} onChange={(v) => patch({ end: Math.max(v, layer.start + 0.2) })} />
            <PillRow label="Position">
              {(["top", "middle", "bottom"] as TextPosition[]).map((p) => (
                <Pill key={p} active={layer.position === p} onClick={() => patch({ position: p })}>
                  {p}
                </Pill>
              ))}
            </PillRow>
            <PillRow label="Size">
              {(["s", "m", "l"] as TextSize[]).map((s) => (
                <Pill key={s} active={layer.size === s} onClick={() => patch({ size: s })}>
                  {s === "s" ? "Small" : s === "m" ? "Medium" : "Large"}
                </Pill>
              ))}
            </PillRow>
            <PillRow label="Colour">
              {(["white", "gold"] as TextColor[]).map((c) => (
                <Pill key={c} active={layer.color === c} onClick={() => patch({ color: c })}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <PillRow label="Tracking">
              <Pill active={Boolean(layer.follow)} onClick={() => (layer.follow ? patch({ follow: undefined }) : onTrack({ kind: "text", id: layer.id }))}>
                {layer.follow ? "Following an object" : "Track an object"}
              </Pill>
            </PillRow>
            <button type="button" onClick={() => dispatch({ type: "deleteText", id: layer.id })} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
              <Trash2 size={15} aria-hidden="true" /> Delete this text
            </button>
          </div>
        ) : (
          <Note>Tap a text bar on the timeline to edit it.</Note>
        )}
      </Group>

      <Group title="Auto captions (beta)">
        <ActionButton onClick={generate} disabled={!project.clips.length} tone="gold">
          Generate captions
        </ActionButton>
        <Note>{CAPTION_DOWNLOAD_NOTE} English speech. Runs on your device, so nothing is uploaded.</Note>
        <div>
          <p className="mb-2 text-xs text-ink-muted">Style</p>
          <PillRow label="Caption style">
            {captionStyles.map((s) => (
              <Pill key={s.id} active={project.captionStyle === s.id} onClick={() => dispatch({ type: "setCaptionStyle", style: s.id })}>
                {s.label}
              </Pill>
            ))}
          </PillRow>
        </div>
        <div>
          <p className="mb-2 text-xs text-ink-muted">Sound effect on each caption</p>
          <PillRow label="Caption sound effect">
            {sfxChoices.map((s) => (
              <Pill key={s.id} active={project.captionSfx === s.id} onClick={() => dispatch({ type: "setCaptionSfx", sfx: s.id })}>
                {s.label}
              </Pill>
            ))}
          </PillRow>
        </div>
        {lines.length ? (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">Edit the words</p>
            {lines.map((l, i) => (
              <label key={`${l[0].start}-${i}`} className="block">
                <span className="font-mono text-xs text-ink-subtle">{formatTime(l[0].start)}</span>
                <textarea value={l.map((w) => w.text).join(" ")} rows={1} onChange={(e) => editLine(i, e.target.value)} className={`${inputClass} mt-1 !py-2`} />
              </label>
            ))}
            <Pill onClick={() => dispatch({ type: "setCaptions", words: [] })}>Remove captions</Pill>
          </div>
        ) : null}
      </Group>
    </div>
  );
}

// ---- Overlays ----

export function OverlayPanel({
  project,
  dispatch,
  engine,
  sources,
  selection,
  setSelection,
  pick,
  addMedia,
  total,
  layer,
  onTrack,
}: PanelProps & { layer?: OverlayLayer; onTrack: (target: { kind: "text" | "layer"; id: string }) => void }) {
  const patch = (p: Partial<OverlayLayer>) => layer && dispatch({ type: "updateLayer", id: layer.id, patch: p });

  function add(kind: "image" | "video") {
    pick(kind === "image" ? "image/*" : "video/*", async (file) => {
      const source = await addMedia(file);
      if (!source || !engine) return;
      const start = Math.min(engine.getTime(), Math.max(total - 0.5, 0));
      const length = kind === "image" ? 4 : Math.min(source.duration || 4, 8);
      const next: OverlayLayer = {
        id: newId("layer"),
        sourceId: source.id,
        kind,
        start,
        end: start + Math.max(length, 0.5),
        in: 0,
        tf: { ...baseTransform, x: kind === "video" ? 0.24 : 0, y: kind === "video" ? 0.26 : -0.2 },
        keys: [],
        mask: noMask,
        width: kind === "video" ? 0.42 : 0.5,
      };
      dispatch({ type: "addLayer", layer: next });
      setSelection({ kind: "layer", id: next.id });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => add("image")} disabled={!project.clips.length}>
          <ImagePlus size={15} aria-hidden="true" /> Add picture
        </ActionButton>
        <ActionButton onClick={() => add("video")} disabled={!project.clips.length}>
          <Video size={15} aria-hidden="true" /> Add video (picture in picture)
        </ActionButton>
      </div>
      {!project.layers.length ? <Empty>Add a picture, logo or second video to place on top of your footage.</Empty> : null}
      {project.layers.length ? (
        <PillRow label="Overlays">
          {project.layers.map((l, i) => (
            <Pill key={l.id} active={selection?.kind === "layer" && selection.id === l.id} onClick={() => setSelection({ kind: "layer", id: l.id })}>
              {l.kind === "image" ? "Picture" : "Video"} {i + 1} · {sources.find((s) => s.id === l.sourceId)?.name.slice(0, 14)}
            </Pill>
          ))}
        </PillRow>
      ) : null}
      {layer ? (
        <div className="space-y-4">
          <Group title="Timing and size" open>
            <Slider label="Starts" value={Number(layer.start.toFixed(1))} min={0} max={Math.max(total, 1)} step={0.1} format={formatTime} onChange={(v) => patch({ start: v, end: Math.max(layer.end, v + 0.5) })} />
            <Slider label="Ends" value={Number(layer.end.toFixed(1))} min={0} max={Math.max(total, 1)} step={0.1} format={formatTime} onChange={(v) => patch({ end: Math.max(v, layer.start + 0.3) })} />
            <Slider label="Width" value={layer.width} min={0.1} max={1} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch({ width: v })} />
          </Group>
          <Group title="Position and animation">
            <TransformEditor engine={engine} start={layer.start} length={layer.end - layer.start} tf={layer.tf} keys={layer.keys} onTf={(tf) => patch({ tf })} onKeys={(keys) => patch({ keys })} />
          </Group>
          <Group title="Mask">
            <MaskEditor mask={layer.mask} onChange={(mask) => patch({ mask })} />
          </Group>
          <PillRow label="Tracking">
            <Pill active={Boolean(layer.follow)} onClick={() => (layer.follow ? patch({ follow: undefined }) : onTrack({ kind: "layer", id: layer.id }))}>
              {layer.follow ? "Following an object" : "Track an object"}
            </Pill>
          </PillRow>
          <button type="button" onClick={() => dispatch({ type: "deleteLayer", id: layer.id })} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
            <Trash2 size={15} aria-hidden="true" /> Delete this overlay
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---- Canvas ----

const backgrounds: { id: BackgroundKind; label: string }[] = [
  { id: "glow", label: "Glow" },
  { id: "color", label: "Colour" },
  { id: "blur", label: "Blurred video" },
  { id: "image", label: "Picture" },
];

export function CanvasPanel({
  project,
  dispatch,
  quality,
  onQuality,
  pick,
  addMedia,
}: PanelProps & { quality: QualityId; onQuality: (q: QualityId) => void }) {
  const { overlays, background } = project;
  const setOverlays = (next: typeof overlays) => dispatch({ type: "setOverlays", overlays: next });

  return (
    <div className="space-y-4">
      <Group title="Shape and quality" open>
        <PillRow label="Shape">
          {(Object.keys(ratios) as RatioId[]).map((id) => (
            <Pill key={id} active={project.ratio === id} onClick={() => dispatch({ type: "setRatio", ratio: id })} title={ratios[id].hint}>
              {ratios[id].label} · {ratios[id].hint}
            </Pill>
          ))}
        </PillRow>
        <PillRow label="Quality">
          <Pill active={quality === "720"} onClick={() => onQuality("720")}>
            720p (lighter)
          </Pill>
          <Pill active={quality === "1080"} onClick={() => onQuality("1080")}>
            1080p (sharper)
          </Pill>
        </PillRow>
      </Group>

      <Group title="Background" open>
        <PillRow label="Background">
          {backgrounds.map((b) => (
            <Pill key={b.id} active={background.kind === b.id} onClick={() => dispatch({ type: "setBackground", background: { ...background, kind: b.id } })}>
              {b.label}
            </Pill>
          ))}
        </PillRow>
        {background.kind === "color" ? (
          <input type="color" aria-label="Background colour" value={background.color} onChange={(e) => dispatch({ type: "setBackground", background: { ...background, color: e.target.value } })} className="h-11 w-24 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
        ) : null}
        {background.kind === "image" ? (
          <ActionButton
            onClick={() =>
              pick("image/*", async (file) => {
                const source = await addMedia(file);
                if (source) dispatch({ type: "setBackground", background: { ...background, kind: "image", imageSourceId: source.id } });
              })
            }
          >
            {background.imageSourceId ? "Change picture" : "Choose a picture"}
          </ActionButton>
        ) : null}
        <Note>The background shows behind clips set to Fit inside, behind cut-out people, and around small overlays.</Note>
      </Group>

      <Group title="GREAT VAL branding">
        <Pill active={overlays.watermark} onClick={() => setOverlays({ ...overlays, watermark: !overlays.watermark })}>
          Logo watermark {overlays.watermark ? "on" : "off"}
        </Pill>
        <Pill active={overlays.lowerThird.on} onClick={() => setOverlays({ ...overlays, lowerThird: { ...overlays.lowerThird, on: !overlays.lowerThird.on } })}>
          Name tag {overlays.lowerThird.on ? "on" : "off"}
        </Pill>
        {overlays.lowerThird.on ? (
          <div className="space-y-2">
            <input aria-label="Name tag title" placeholder="Title, for example @greatvalfc" value={overlays.lowerThird.title} onChange={(e) => setOverlays({ ...overlays, lowerThird: { ...overlays.lowerThird, title: e.target.value } })} className={inputClass} />
            <input aria-label="Name tag subtitle" placeholder="Subtitle" value={overlays.lowerThird.subtitle} onChange={(e) => setOverlays({ ...overlays, lowerThird: { ...overlays.lowerThird, subtitle: e.target.value } })} className={inputClass} />
          </div>
        ) : null}
        <Pill active={overlays.banner.on} onClick={() => setOverlays({ ...overlays, banner: { ...overlays.banner, on: !overlays.banner.on } })}>
          Website banner {overlays.banner.on ? "on" : "off"}
        </Pill>
        {overlays.banner.on ? <input aria-label="Banner text" value={overlays.banner.text} onChange={(e) => setOverlays({ ...overlays, banner: { ...overlays.banner, text: e.target.value } })} className={inputClass} /> : null}
      </Group>
    </div>
  );
}
