"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Upload } from "lucide-react";
import { Container } from "@/components/ui/container";
import { formatTime } from "@/lib/studio/format";
import { outputDuration } from "@/lib/reel/edl";
import { analyseSpeech, defaultSilenceOptions, type SilenceOptions } from "@/lib/reel/silence";
import { Note, Slider } from "@/components/studio/ui";

/** Brick 1: find the speech in a video and show what the silence trim will do. */
export function ReelLab() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [options, setOptions] = useState<SilenceOptions>(defaultSilenceOptions);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef(0);

  const analysis = useMemo(() => (buffer ? analyseSpeech(buffer, options) : null), [buffer, options]);
  const cutsRef = useRef(analysis?.cuts ?? []);
  useEffect(() => {
    cutsRef.current = analysis?.cuts ?? [];
  }, [analysis]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  async function load(f: File) {
    setError(null);
    setBusy(true);
    setBuffer(null);
    setPlaying(false);
    try {
      if (f.size > 250 * 1024 * 1024) throw new Error("This file is too large to analyse in the browser.");
      const ctx = new AudioContext();
      try {
        setBuffer(await ctx.decodeAudioData(await f.arrayBuffer()));
      } catch {
        throw new Error("This video has no sound I can read.");
      } finally {
        void ctx.close();
      }
      setFile(f);
      setUrl(URL.createObjectURL(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open that file.");
    } finally {
      setBusy(false);
    }
  }

  // While playing, jump over the parts that were cut out.
  useEffect(() => {
    const v = video.current;
    if (!v || !playing) return;
    const tick = () => {
      const t = v.currentTime;
      const cuts = cutsRef.current;
      if (cuts.length && !cuts.some((c) => t >= c.keep_start && t < c.keep_end)) {
        const next = cuts.find((c) => c.keep_start > t);
        if (next) v.currentTime = next.keep_start;
        else {
          v.pause();
          setPlaying(false);
          return;
        }
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing]);

  function toggle() {
    const v = video.current;
    if (!v || !analysis) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      if (v.currentTime >= analysis.duration - 0.1 || !analysis.cuts.some((c) => v.currentTime >= c.keep_start && v.currentTime < c.keep_end)) v.currentTime = analysis.cuts[0]?.keep_start ?? 0;
      void v.play();
      setPlaying(true);
    }
  }

  const kept = analysis ? outputDuration(analysis.cuts) : 0;

  return (
    <section aria-labelledby="reel-title" className="py-8 sm:py-12">
      <Container>
        <h1 id="reel-title" className="text-3xl font-bold sm:text-4xl">
          Reel editor <span className="font-mono text-sm text-accent">brick 1 of 5</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">
          Drop in a talking-head video. I find the speech and cut the pauses. Nothing is uploaded.
        </p>

        <label className="btn-glass mt-6 inline-flex cursor-pointer">
          <Upload size={18} aria-hidden="true" />
          {busy ? "Listening..." : file ? "Choose another video" : "Choose a video"}
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
              e.target.value = "";
            }}
          />
        </label>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        {analysis && url ? (
          <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-3">
              <video ref={video} src={url} playsInline controls={false} onEnded={() => setPlaying(false)} className="max-h-[50vh] w-full rounded-2xl bg-black object-contain" aria-label="Preview of the trimmed video" />
              <button type="button" onClick={toggle} className="btn-glass">
                {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                {playing ? "Pause" : "Play the trimmed version"}
              </button>
            </div>

            <div className="min-w-0 space-y-5">
              <dl className="grid grid-cols-3 gap-3 text-center">
                {[
                  ["Original", formatTime(analysis.duration)],
                  ["After trim", formatTime(kept)],
                  ["Pauses cut", String(analysis.silences.length)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <dt className="text-xs text-ink-muted">{k}</dt>
                    <dd className="mt-1 font-mono text-lg tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>

              <svg viewBox={`0 0 ${analysis.peaks.length} 60`} preserveAspectRatio="none" role="img" aria-label="Sound wave. Gold parts are kept and grey parts are cut." className="h-20 w-full rounded-xl border border-white/10 bg-black/30">
                {analysis.peaks.map((p, i) => {
                  const t = (i / analysis.peaks.length) * analysis.duration;
                  const keep = analysis.cuts.some((c) => t >= c.keep_start && t <= c.keep_end);
                  const h = Math.max(1.5, p * 56);
                  return <rect key={i} x={i} y={30 - h / 2} width={0.7} height={h} className={keep ? "fill-accent" : "fill-white/20"} />;
                })}
              </svg>

              <Slider label="Cut pauses longer than" value={options.minSilence} min={0.15} max={0.6} step={0.05} format={(v) => `${Math.round(v * 1000)} ms`} onChange={(v) => setOptions((o) => ({ ...o, minSilence: v }))} />
              <Slider label="Keep around each phrase" value={options.padding} min={0.03} max={0.25} step={0.01} format={(v) => `${Math.round(v * 1000)} ms`} onChange={(v) => setOptions((o) => ({ ...o, padding: v }))} />
              <Note>
                Too choppy or clipped words? Raise the pause length or the padding. Around 300 ms and 100 ms usually sounds natural.
              </Note>
            </div>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
