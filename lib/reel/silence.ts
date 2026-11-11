import type { Cut, Span } from "./edl";

export interface SilenceOptions {
  /** Pauses longer than this are removed (seconds). */
  minSilence: number;
  /** Breathing room kept on each side of speech so words are not clipped (seconds). */
  padding: number;
}

export const defaultSilenceOptions: SilenceOptions = { minSilence: 0.3, padding: 0.1 };

export interface SpeechAnalysis {
  duration: number;
  /** Waveform for drawing: one loudness value (0..1) per bucket. */
  peaks: number[];
  /** Silences found, in original-video time. This is the "silence map" the AI step receives. */
  silences: Span[];
  /** The parts to keep, with padding applied. */
  cuts: Cut[];
}

const FRAME = 0.01; // 10 ms
const PEAK_BUCKETS = 400;

/** Loudness of each 10 ms frame in dB. */
function frameLevels(buffer: AudioBuffer): { db: number[]; peaks: number[] } {
  const data = buffer.getChannelData(0);
  const size = Math.max(1, Math.round(buffer.sampleRate * FRAME));
  const frames = Math.floor(data.length / size);
  const db: number[] = new Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    const base = i * size;
    for (let j = 0; j < size; j++) sum += data[base + j] * data[base + j];
    db[i] = 20 * Math.log10(Math.sqrt(sum / size) + 1e-9);
  }
  const peaks: number[] = [];
  const per = Math.max(1, Math.floor(frames / PEAK_BUCKETS));
  for (let i = 0; i < frames; i += per) {
    let m = -100;
    for (let j = i; j < Math.min(frames, i + per); j++) m = Math.max(m, db[j]);
    peaks.push(Math.min(Math.max((m + 60) / 60, 0), 1));
  }
  return { db, peaks };
}

/**
 * Finds the speech in a recording and returns what to keep.
 * The loudness threshold adapts to the recording, so a quiet phone mic and a loud one both work.
 */
export function analyseSpeech(buffer: AudioBuffer, options: SilenceOptions = defaultSilenceOptions): SpeechAnalysis {
  const { db, peaks } = frameLevels(buffer);
  const duration = buffer.duration;
  if (db.length < 10) return { duration, peaks, silences: [], cuts: [{ keep_start: 0, keep_end: duration }] };

  const sorted = [...db].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const loud = sorted[Math.floor(sorted.length * 0.95)];
  // Halfway between the background noise and the speech peaks, never below -55 dB.
  const threshold = Math.max(floor + (loud - floor) * 0.3, -55);

  // Runs of speech, in frames.
  const runs: [number, number][] = [];
  let start = -1;
  db.forEach((v, i) => {
    if (v > threshold) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      runs.push([start, i]);
      start = -1;
    }
  });
  if (start >= 0) runs.push([start, db.length]);

  // Close small gaps (the pauses between letters and words), then drop clicks and bumps.
  const gapFrames = Math.round(options.minSilence / FRAME);
  const merged: [number, number][] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && run[0] - last[1] < gapFrames) last[1] = run[1];
    else merged.push([run[0], run[1]]);
  }
  const speech = merged.filter(([a, b]) => b - a >= 12);
  if (!speech.length) return { duration, peaks, silences: [], cuts: [{ keep_start: 0, keep_end: duration }] };

  const silences: Span[] = [];
  let cursor = 0;
  for (const [a, b] of speech) {
    if (a * FRAME - cursor >= options.minSilence) silences.push({ start: cursor, end: a * FRAME });
    cursor = b * FRAME;
  }
  if (duration - cursor >= options.minSilence) silences.push({ start: cursor, end: duration });

  const cuts: Cut[] = [];
  for (const [a, b] of speech) {
    const keep_start = Math.max(0, a * FRAME - options.padding);
    const keep_end = Math.min(duration, b * FRAME + options.padding);
    const last = cuts[cuts.length - 1];
    if (last && keep_start <= last.keep_end) last.keep_end = Math.max(last.keep_end, keep_end);
    else cuts.push({ keep_start, keep_end });
  }
  return { duration, peaks, silences, cuts };
}
