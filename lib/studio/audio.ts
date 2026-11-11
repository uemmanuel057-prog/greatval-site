import type { SfxName, VoiceEffect } from "./types";

/** Audio effects built only from the browser's own audio nodes, so nothing extra is downloaded. */

export interface Chain {
  input: AudioNode;
  output: AudioNode;
}

function passthrough(ctx: BaseAudioContext): Chain {
  const g = ctx.createGain();
  return { input: g, output: g };
}

/** Pitch shifter made from two crossfading, modulated delay lines. mult is about -1 (octave down) to 1 (octave up). */
function pitchShifter(ctx: BaseAudioContext, mult: number): Chain {
  const sr = ctx.sampleRate;
  const bufferTime = 0.1;
  const fadeTime = 0.05;
  const delayTime = 0.1;

  const fadeBuffer = (() => {
    const len1 = bufferTime * sr;
    const len2 = len1 - fadeTime * sr;
    const len = len1 + len2;
    const buf = ctx.createBuffer(1, len, sr);
    const p = buf.getChannelData(0);
    const fadeLen = fadeTime * sr;
    const fadeIndex2 = len1 - fadeTime * sr;
    for (let i = 0; i < len; i++) {
      if (i < fadeLen) p[i] = Math.sqrt(i / fadeLen);
      else if (i >= fadeIndex2) p[i] = Math.sqrt(Math.max(0, 1 - (i - fadeIndex2) / fadeLen));
      else p[i] = 1;
    }
    return buf;
  })();

  const delayBuffer = (shiftUp: boolean) => {
    const len1 = bufferTime * sr;
    const len2 = len1 - fadeTime * sr;
    const len = len1 + len2;
    const buf = ctx.createBuffer(1, len, sr);
    const p = buf.getChannelData(0);
    for (let i = 0; i < len1; i++) p[i] = shiftUp ? (len1 - i) / len : i / len1;
    return buf;
  };

  const source = (buffer: AudioBuffer) => {
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    return s;
  };

  const input = ctx.createGain();
  const output = ctx.createGain();
  const up = mult > 0;
  const mod1 = source(delayBuffer(up));
  const mod2 = source(delayBuffer(up));
  const modGain1 = ctx.createGain();
  const modGain2 = ctx.createGain();
  const amount = 0.5 * delayTime * Math.abs(mult);
  modGain1.gain.value = amount;
  modGain2.gain.value = amount;
  const delay1 = ctx.createDelay();
  const delay2 = ctx.createDelay();
  mod1.connect(modGain1);
  mod2.connect(modGain2);
  modGain1.connect(delay1.delayTime);
  modGain2.connect(delay2.delayTime);

  const fade1 = source(fadeBuffer);
  const fade2 = source(fadeBuffer);
  const mix1 = ctx.createGain();
  const mix2 = ctx.createGain();
  mix1.gain.value = 0;
  mix2.gain.value = 0;
  fade1.connect(mix1.gain);
  fade2.connect(mix2.gain);

  input.connect(delay1);
  input.connect(delay2);
  delay1.connect(mix1);
  delay2.connect(mix2);
  mix1.connect(output);
  mix2.connect(output);

  const t = ctx.currentTime + 0.05;
  const t2 = t + bufferTime - fadeTime;
  mod1.start(t);
  mod2.start(t2);
  fade1.start(t);
  fade2.start(t2);
  return { input, output };
}

function ringModulator(ctx: BaseAudioContext): Chain {
  const input = ctx.createGain();
  const carrier = ctx.createGain();
  carrier.gain.value = 0;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 55;
  osc.connect(carrier.gain);
  osc.start();
  const out = ctx.createGain();
  out.gain.value = 1.4;
  input.connect(carrier);
  carrier.connect(out);
  return { input, output: out };
}

function echo(ctx: BaseAudioContext): Chain {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.26;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  input.connect(output);
  input.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  return { input, output };
}

/** Voice clean-up: cuts rumble and hiss, lifts speech, and evens out loudness. */
function cleanStage(ctx: BaseAudioContext): Chain {
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 95;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 9500;
  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 3000;
  presence.gain.value = 3;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -30;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;
  hp.connect(lp);
  lp.connect(presence);
  presence.connect(comp);
  return { input: hp, output: comp };
}

function voiceStage(ctx: BaseAudioContext, voice: VoiceEffect): Chain {
  switch (voice) {
    case "deep":
      return pitchShifter(ctx, -0.42);
    case "high":
      return pitchShifter(ctx, 0.5);
    case "robot":
      return ringModulator(ctx);
    case "echo":
      return echo(ctx);
    default:
      return passthrough(ctx);
  }
}

export function buildChain(ctx: BaseAudioContext, voice: VoiceEffect, clean: boolean): Chain {
  const stages: Chain[] = [];
  if (clean) stages.push(cleanStage(ctx));
  stages.push(voiceStage(ctx, voice));
  for (let i = 0; i < stages.length - 1; i++) stages[i].output.connect(stages[i + 1].input);
  return { input: stages[0].input, output: stages[stages.length - 1].output };
}

// ---- sound effects, made from scratch ----

function noise(ctx: BaseAudioContext, seconds: number): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  return s;
}

/** Plays a sound effect into `dest` at `when` (audio-clock seconds). */
export function playSfx(ctx: AudioContext, dest: AudioNode, name: SfxName, when = ctx.currentTime) {
  const env = (peak: number, attack: number, length: number) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + length);
    g.connect(dest);
    return g;
  };
  if (name === "whoosh") {
    const n = noise(ctx, 0.7);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(350, when);
    f.frequency.exponentialRampToValueAtTime(3600, when + 0.55);
    n.connect(f);
    f.connect(env(0.8, 0.25, 0.65));
    n.start(when);
  } else if (name === "pop") {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(720, when);
    o.frequency.exponentialRampToValueAtTime(140, when + 0.1);
    o.connect(env(0.9, 0.004, 0.14));
    o.start(when);
    o.stop(when + 0.2);
  } else if (name === "boom") {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(120, when);
    o.frequency.exponentialRampToValueAtTime(32, when + 0.9);
    o.connect(env(1, 0.005, 1.1));
    o.start(when);
    o.stop(when + 1.2);
    const n = noise(ctx, 0.3);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    n.connect(lp);
    lp.connect(env(0.6, 0.003, 0.25));
    n.start(when);
  } else {
    [0, 0.085].forEach((offset) => {
      const n = noise(ctx, 0.05);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when + offset);
      g.gain.linearRampToValueAtTime(0.7, when + offset + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, when + offset + 0.05);
      n.connect(hp);
      hp.connect(g);
      g.connect(dest);
      n.start(when + offset);
    });
  }
}

// ---- beats ----

/** Finds the beats in a piece of audio and returns their times in seconds. */
export function detectBeats(buffer: AudioBuffer): number[] {
  const sr = buffer.sampleRate;
  const channel = buffer.getChannelData(0);
  const hop = Math.round(sr * 0.0116);
  const frames = Math.floor(channel.length / hop);
  if (frames < 20) return [];
  const energy = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    const base = i * hop;
    for (let j = 0; j < hop; j += 2) sum += channel[base + j] * channel[base + j];
    energy[i] = Math.sqrt(sum / (hop / 2));
  }
  // Onset strength: how much louder this moment is than the one before.
  const flux = new Float32Array(frames);
  for (let i = 1; i < frames; i++) flux[i] = Math.max(0, energy[i] - energy[i - 1]);
  const win = Math.round(1 / 0.0116);
  const minGap = Math.round(0.28 / 0.0116);
  const beats: number[] = [];
  let lastIndex = -minGap;
  for (let i = 1; i < frames - 1; i++) {
    const from = Math.max(0, i - win);
    const to = Math.min(frames, i + win);
    let mean = 0;
    for (let k = from; k < to; k++) mean += flux[k];
    mean /= to - from;
    if (flux[i] > mean * 1.8 + 0.002 && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1] && i - lastIndex >= minGap) {
      beats.push(i * 0.0116);
      lastIndex = i;
    }
  }
  return beats;
}

/** A tempo estimate from the beat times, or null when there are too few. */
export function estimateBpm(beats: number[]): number | null {
  if (beats.length < 6) return null;
  const gaps = beats.slice(1).map((b, i) => b - beats[i]).sort((a, b) => a - b);
  let median = gaps[Math.floor(gaps.length / 2)];
  if (!median) return null;
  while (60 / median < 70) median /= 2;
  while (60 / median > 170) median *= 2;
  return Math.round(60 / median);
}
