"use client";

import { Music2, Trash2, Waves } from "lucide-react";
import { detectBeats, estimateBpm } from "@/lib/studio/audio";
import { formatTime } from "@/lib/studio/format";
import { layout, newId } from "@/lib/studio/project";
import type { AudioItem, Clip, SfxName, VoiceEffect } from "@/lib/studio/types";
import { ActionButton, Empty, Group, Note, Pill, PillRow, Slider, type PanelProps } from "./ui";

const voices: { id: VoiceEffect; label: string }[] = [
  { id: "none", label: "Normal" },
  { id: "deep", label: "Deep" },
  { id: "high", label: "High" },
  { id: "robot", label: "Robot" },
  { id: "echo", label: "Echo" },
];

const sfxList: { id: SfxName; label: string }[] = [
  { id: "whoosh", label: "Whoosh" },
  { id: "pop", label: "Pop" },
  { id: "boom", label: "Boom" },
  { id: "shutter", label: "Shutter" },
  { id: "ding", label: "Ding" },
  { id: "click", label: "Click" },
  { id: "riser", label: "Riser" },
  { id: "hit", label: "Hit" },
  { id: "glitch", label: "Glitch" },
  { id: "sparkle", label: "Sparkle" },
  { id: "swipe", label: "Swipe" },
];

export function AudioPanel({
  project,
  dispatch,
  engine,
  sources,
  run,
  pick,
  addMedia,
  notify,
  clip,
  onExportAudio,
  total,
}: PanelProps & { clip: Clip | null; onExportAudio: () => void }) {
  const patch = (p: Partial<Clip>) => clip && dispatch({ type: "updateClip", id: clip.id, patch: p });
  const music = project.audio.filter((a) => a.kind === "music");
  const sfx = project.audio.filter((a) => a.kind === "sfx");
  const nameOf = (id?: string) => sources.find((s) => s.id === id)?.name ?? "Music";
  const bpm = estimateBpm(project.beats);

  function addMusic() {
    pick("audio/*", async (file) => {
      const source = await addMedia(file);
      if (!source) return;
      const item: AudioItem = { id: newId("aud"), kind: "music", sourceId: source.id, start: engine ? Math.min(engine.getTime(), total) : 0, volume: 0.8 };
      dispatch({ type: "addAudio", item });
    });
  }

  function addSfx(name: SfxName) {
    if (!engine) return;
    engine.previewSfx(name);
    dispatch({ type: "addAudio", item: { id: newId("aud"), kind: "sfx", sfx: name, start: engine.getTime(), volume: 1 } });
  }

  async function findBeats() {
    if (!engine) return;
    await run("Listening for the beat...", async () => {
      let beats: number[] = [];
      const track = music.find((m) => m.sourceId);
      if (track?.sourceId) {
        beats = detectBeats(await engine.decodeAudio(track.sourceId)).map((b) => b + track.start);
      } else {
        for (const item of layout(project.clips)) {
          const c = item.clip;
          if (c.freeze !== undefined || c.reverse) continue;
          const buffer = await engine.decodeAudio(c.sourceId).catch(() => null);
          if (!buffer) continue;
          const found = detectBeats(buffer).filter((b) => b >= c.in && b <= c.out);
          beats.push(...found.map((b) => item.start + (b - c.in) / c.speed));
        }
      }
      beats.sort((a, b) => a - b);
      if (!beats.length) notify("No clear beat was found in this audio.");
      dispatch({ type: "setBeats", beats });
    });
  }

  function cutOnBeats(every: number) {
    project.beats.filter((_, i) => i % every === 0).forEach((t) => dispatch({ type: "split", t }));
  }

  function nextBeat() {
    if (!engine) return;
    const now = engine.getTime();
    const next = project.beats.find((b) => b > now + 0.02);
    if (next !== undefined) engine.seek(next);
  }

  return (
    <div className="space-y-4">
      <Group title="Mixer" open>
        <Slider label="Video sound" value={project.mix.main} min={0} max={1.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => dispatch({ type: "setMix", mix: { ...project.mix, main: v } })} />
        <Slider label="Music" value={project.mix.music} min={0} max={1.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => dispatch({ type: "setMix", mix: { ...project.mix, music: v } })} />
        <Slider label="Sound effects" value={project.mix.sfx} min={0} max={1.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => dispatch({ type: "setMix", mix: { ...project.mix, sfx: v } })} />
      </Group>

      <Group title="Selected clip's voice" open={Boolean(clip)}>
        {clip ? (
          <>
            <Slider label="Clip volume" value={clip.volume} min={0} max={2} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch({ volume: v })} />
            <PillRow label="Voice effect">
              {voices.map((v) => (
                <Pill key={v.id} active={clip.voice === v.id} onClick={() => patch({ voice: v.id })}>
                  {v.label}
                </Pill>
              ))}
            </PillRow>
            <Pill active={clip.cleanVoice} onClick={() => patch({ cleanVoice: !clip.cleanVoice })}>
              Clean up voice
            </Pill>
            <Note>Clean up cuts rumble and hiss and lifts speech with filters. It helps a little; it is not a full noise remover.</Note>
          </>
        ) : (
          <Empty>Tap a clip on the timeline to change its volume or voice.</Empty>
        )}
      </Group>

      <Group title="Music">
        <ActionButton onClick={addMusic}>
          <Music2 size={15} aria-hidden="true" /> Add music
        </ActionButton>
        {music.map((m) => (
          <div key={m.id} className="space-y-3 rounded-xl border border-white/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm text-ink">{nameOf(m.sourceId)}</p>
              <button type="button" aria-label="Remove music" onClick={() => dispatch({ type: "deleteAudio", id: m.id })} className="grid size-8 place-items-center rounded-full text-ink-muted hover:text-ink">
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
            <Slider label="Starts at" value={Number(m.start.toFixed(1))} min={0} max={Math.max(total, 1)} step={0.1} format={formatTime} onChange={(v) => dispatch({ type: "updateAudio", id: m.id, patch: { start: v } })} />
            <Slider label="Volume" value={m.volume} min={0} max={1.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => dispatch({ type: "updateAudio", id: m.id, patch: { volume: v } })} />
          </div>
        ))}
      </Group>

      <Group title="Sound effects">
        <PillRow label="Add a sound effect at the playhead">
          {sfxList.map((s) => (
            <Pill key={s.id} onClick={() => addSfx(s.id)}>
              {s.label}
            </Pill>
          ))}
        </PillRow>
        <Note>Tap to hear it and place it at the playhead. To put one on every caption, use the Text tab.</Note>
        {sfx.length ? (
          <div className="flex flex-wrap gap-2">
            {sfx.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-white/10 py-1 pl-3 pr-1 text-xs text-ink-muted">
                {s.sfx} · {formatTime(s.start)}
                <button type="button" aria-label={`Remove ${s.sfx}`} onClick={() => dispatch({ type: "deleteAudio", id: s.id })} className="grid size-6 place-items-center rounded-full hover:bg-white/10">
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </Group>

      <Group title="Beats">
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={findBeats} disabled={!project.clips.length}>
            <Waves size={15} aria-hidden="true" /> Find beats
          </ActionButton>
          <ActionButton onClick={() => engine && dispatch({ type: "setBeats", beats: [...project.beats, engine.getTime()].sort((a, b) => a - b) })}>Tap a beat here</ActionButton>
        </div>
        {project.beats.length ? (
          <>
            <p className="text-sm text-ink-muted">
              {project.beats.length} beats{bpm ? ` · about ${bpm} BPM` : ""}. They show as gold ticks on the timeline.
            </p>
            <PillRow label="Beat actions">
              <Pill onClick={nextBeat}>Jump to next beat</Pill>
              <Pill onClick={() => cutOnBeats(1)}>Cut on every beat</Pill>
              <Pill onClick={() => cutOnBeats(2)}>Every 2nd</Pill>
              <Pill onClick={() => cutOnBeats(4)}>Every 4th</Pill>
              <Pill onClick={() => dispatch({ type: "setBeats", beats: [] })}>Clear</Pill>
            </PillRow>
          </>
        ) : (
          <Note>Finds beats in your music, or in the video&apos;s own sound when there is no music. You can also tap beats in by hand.</Note>
        )}
      </Group>

      <Group title="Extract audio">
        <ActionButton onClick={onExportAudio} disabled={!project.clips.length}>
          Save the sound only
        </ActionButton>
        <Note>Saves the mixed sound of your timeline as an audio file. It records in real time.</Note>
      </Group>
    </div>
  );
}
