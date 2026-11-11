import { buildChain, playSfx, type Chain } from "./audio";
import { stabilizeAt, trackAt, type StabilizeData } from "./analysis";
import { loadSegmenter, type Segmenter } from "./ai";
import { evalTransform, layout, locate, newId, playbackRateAt, sourceTimeAt, totalDuration } from "./project";
import { captionLines, drawFrame, makeScratch, mapPoint, noTrans, unmapPoint, type LayerDraw, type Scene } from "./render";
import {
  canvasSize,
  initialProject,
  neutralAdjust,
  noMask,
  type Chroma,
  type Clip,
  type Project,
  type QualityId,
  type SfxName,
  type Source,
} from "./types";

interface Runtime {
  source: Source;
  file: File;
  el: HTMLVideoElement | HTMLAudioElement | null;
  image: HTMLImageElement | null;
  gain?: GainNode;
  chains: Map<string, Chain>;
  route?: string;
  buffer?: AudioBuffer;
}

interface AudioGraph {
  ctx: AudioContext;
  master: GainNode;
  main: GainNode;
  music: GainNode;
  sfx: GainNode;
  /** Feeds the recorder. Connected only to the exporter, never to speakers. */
  rec: MediaStreamAudioDestinationNode;
}

interface ReverseCache {
  in: number;
  out: number;
  fps: number;
  blobs: Blob[];
  bitmaps: Map<number, ImageBitmap>;
  pending: Set<number>;
  last: ImageBitmap | null;
}

const VIDEO_MIME = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];
const AUDIO_MIME = ["audio/mp4;codecs=mp4a.40.2", "audio/webm;codecs=opus", "audio/webm"];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const REVERSE_FPS = 15;
export const REVERSE_MAX_SECONDS = 20;

/**
 * Plays and exports the project in the browser. It keeps one hidden media element per
 * source, paints the current frame to a canvas, and mixes audio with Web Audio.
 * React only talks to it through a few methods and a few subscribable values.
 */
export class StudioEngine {
  private ctx: CanvasRenderingContext2D;
  private project: Project = initialProject;
  private quality: QualityId = "720";
  private runtimes = new Map<string, Runtime>();
  private t = 0;
  private playing = false;
  private last = 0;
  private prevT = 0;
  private raf = 0;
  private listeners = new Set<() => void>();
  private audio: AudioGraph | null = null;
  private logo: HTMLImageElement;
  private endWaiters: Array<() => void> = [];
  private cancelled = false;
  private busyExporting = false;
  private scratch = makeScratch();
  private keyCanvas = document.createElement("canvas");
  private stab = new Map<string, StabilizeData>();
  private reverse = new Map<string, ReverseCache>();
  private segmenter: Segmenter | null = null;
  private sfxEvents: { t: number; name: SfxName }[] = [];
  private lastMain: LayerDraw | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported in this browser.");
    this.ctx = ctx;
    this.logo = new Image();
    this.logo.onload = () => this.requestDraw();
    this.logo.src = "/brand/greatval-mark.png";
    this.applySize();
  }

  // ---- values React can subscribe to ----
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getTime = () => this.t;
  getPlaying = () => this.playing;
  getExporting = () => this.busyExporting;
  get total() {
    return totalDuration(this.project.clips);
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  // ---- setup ----
  private applySize() {
    const { width, height } = canvasSize(this.project.ratio, this.quality);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  setProject(project: Project) {
    this.project = project;
    this.applySize();
    this.t = Math.min(this.t, this.total);
    if (!project.clips.length) this.pause();
    if (this.audio) this.applyMix();
    this.sfxEvents = [
      ...project.audio.filter((a) => a.kind === "sfx" && a.sfx).map((a) => ({ t: a.start, name: a.sfx as SfxName })),
      ...(project.captionSfx !== "none"
        ? captionLines(project.captions).map((l) => ({ t: l[0].start, name: project.captionSfx as SfxName }))
        : []),
      ...(project.transitionSfx !== "none"
        ? layout(project.clips)
            .filter((item, i) => i > 0 && item.clip.transition.type !== "none")
            .map((item) => ({ t: Math.max(0, item.start - item.clip.transition.duration / 2), name: project.transitionSfx as SfxName }))
        : []),
    ].sort((a, b) => a.t - b.t);
    this.requestDraw();
  }

  setQuality(quality: QualityId) {
    this.quality = quality;
    this.applySize();
    this.requestDraw();
  }

  /** Adds a video, audio file or image. */
  async addSource(file: File): Promise<Source> {
    const url = URL.createObjectURL(file);
    const id = newId("src");
    try {
      if (file.type.startsWith("image/")) {
        const image = new Image();
        image.src = url;
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("This file could not be read as an image."));
        });
        const source: Source = { id, name: file.name, url, kind: "image", duration: 0, width: image.naturalWidth, height: image.naturalHeight };
        this.runtimes.set(id, { source, file, el: null, image, chains: new Map() });
        return source;
      }
      const isAudio = file.type.startsWith("audio/");
      const el = document.createElement(isAudio ? "audio" : "video") as HTMLVideoElement | HTMLAudioElement;
      el.preload = "auto";
      if (el instanceof HTMLVideoElement) el.playsInline = true;
      el.src = url;
      await new Promise<void>((resolve, reject) => {
        el.onloadedmetadata = () => resolve();
        el.onerror = () => reject(new Error(isAudio ? "This file could not be read as audio." : "This file could not be read as a video."));
      });
      if (el instanceof HTMLVideoElement && !el.videoWidth) throw new Error("This file has no video.");
      if (!Number.isFinite(el.duration)) {
        // Some recorded files do not store their length. Seeking far ahead makes the browser work it out.
        await new Promise<void>((resolve) => {
          el.ontimeupdate = () => {
            el.ontimeupdate = null;
            resolve();
          };
          el.currentTime = 1e7;
        });
      }
      el.currentTime = 0.001;
      el.addEventListener("seeked", () => this.requestDraw());
      el.addEventListener("loadeddata", () => this.requestDraw());
      const source: Source = {
        id,
        name: file.name,
        url,
        kind: isAudio ? "audio" : "video",
        duration: el.duration,
        width: el instanceof HTMLVideoElement ? el.videoWidth : 0,
        height: el instanceof HTMLVideoElement ? el.videoHeight : 0,
      };
      const runtime: Runtime = { source, file, el, image: null, chains: new Map() };
      this.runtimes.set(id, runtime);
      if (this.audio) this.connect(runtime);
      return source;
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  // ---- audio ----
  private ensureAudio(): AudioGraph {
    if (this.audio) return this.audio;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const rec = ctx.createMediaStreamDestination();
    master.connect(rec);
    const main = ctx.createGain();
    const music = ctx.createGain();
    const sfx = ctx.createGain();
    main.connect(master);
    music.connect(master);
    sfx.connect(master);
    this.audio = { ctx, master, main, music, sfx, rec };
    this.applyMix();
    this.runtimes.forEach((r) => this.connect(r));
    return this.audio;
  }

  private applyMix() {
    if (!this.audio) return;
    const { mix } = this.project;
    this.audio.main.gain.value = mix.main;
    this.audio.music.gain.value = mix.music;
    this.audio.sfx.gain.value = mix.sfx;
  }

  private connect(runtime: Runtime) {
    if (!this.audio || runtime.gain || !runtime.el) return;
    const node = this.audio.ctx.createMediaElementSource(runtime.el);
    const gain = this.audio.ctx.createGain();
    node.connect(gain);
    runtime.gain = gain;
    this.route(runtime, "none|0", runtime.source.kind === "audio" ? "music" : "main");
  }

  /** Sends a source's sound through the voice effect it needs. */
  private route(runtime: Runtime, key: string, bus: "main" | "music" = "main") {
    if (!this.audio || !runtime.gain || runtime.route === key) return;
    const ctx = this.audio.ctx;
    runtime.gain.disconnect();
    const dest = bus === "main" ? this.audio.main : this.audio.music;
    if (key === "none|0") runtime.gain.connect(dest);
    else {
      let chain = runtime.chains.get(key);
      if (!chain) {
        const [voice, clean] = key.split("|");
        chain = buildChain(ctx, voice as Clip["voice"], clean === "1");
        chain.output.connect(dest);
        runtime.chains.set(key, chain);
      }
      runtime.gain.connect(chain.input);
    }
    runtime.route = key;
  }

  /** Decodes a source's audio, for beat finding and captions. Large files can be heavy, so it is kept to what is needed. */
  async decodeAudio(sourceId: string): Promise<AudioBuffer> {
    const rt = this.runtimes.get(sourceId);
    if (!rt) throw new Error("That file is not loaded.");
    if (rt.buffer) return rt.buffer;
    if (rt.file.size > 250 * 1024 * 1024) throw new Error("This file is too large to analyse in the browser.");
    const graph = this.ensureAudio();
    try {
      rt.buffer = await graph.ctx.decodeAudioData(await rt.file.arrayBuffer());
    } catch {
      throw new Error("This file has no sound to analyse.");
    }
    return rt.buffer;
  }

  /** The timeline's speech as mono 16 kHz samples, which is what the caption model reads. */
  async timelineSamples(): Promise<Float32Array> {
    const rate = 16000;
    const parts: Float32Array[] = [];
    for (const item of layout(this.project.clips)) {
      const c = item.clip;
      const len = Math.round((item.end - item.start) * rate);
      const out = new Float32Array(len);
      if (c.freeze === undefined && !c.reverse) {
        const buffer = await this.decodeAudio(c.sourceId).catch(() => null);
        if (buffer) {
          const data = buffer.getChannelData(0);
          for (let j = 0; j < len; j++) {
            const s = sourceTimeAt(c, j / rate);
            out[j] = data[Math.min(data.length - 1, Math.floor(s * buffer.sampleRate))] ?? 0;
          }
        }
      }
      parts.push(out);
    }
    const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    parts.forEach((p) => {
      all.set(p, offset);
      offset += p.length;
    });
    return all;
  }

  // ---- stabilize, track, reverse, background removal ----
  setStabilize(sourceId: string, data: StabilizeData) {
    this.stab.set(sourceId, data);
    this.requestDraw();
  }

  needsReverse(clip: Clip): boolean {
    const c = this.reverse.get(clip.sourceId);
    return !c || clip.in < c.in - 0.05 || clip.out > c.out + 0.05;
  }

  /** Prepares frames so a clip can play backwards. Browsers cannot play video in reverse directly. */
  async ensureReverse(clip: Clip, onProgress: (f: number) => void): Promise<void> {
    if (!this.needsReverse(clip)) return;
    const rt = this.runtimes.get(clip.sourceId);
    if (!rt || !(rt.el instanceof HTMLVideoElement)) throw new Error("That video is not loaded.");
    const length = clip.out - clip.in;
    if (length > REVERSE_MAX_SECONDS + 0.5) throw new Error(`Reverse works on clips up to ${REVERSE_MAX_SECONDS} seconds. Trim or split the clip first.`);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = rt.source.url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not read the video."));
    });
    const k = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * k);
    canvas.height = Math.round(video.videoHeight * k);
    const cctx = canvas.getContext("2d");
    if (!cctx) throw new Error("Canvas is not supported in this browser.");
    const count = Math.floor(length * REVERSE_FPS) + 1;
    const blobs: Blob[] = [];
    for (let i = 0; i < count; i++) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2000);
        video.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        video.currentTime = Math.min(clip.in + i / REVERSE_FPS, video.duration - 0.001);
      });
      cctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
      if (!blob) throw new Error("Could not prepare the frames.");
      blobs.push(blob);
      onProgress((i + 1) / count);
    }
    video.removeAttribute("src");
    video.load();
    this.reverse.get(clip.sourceId)?.bitmaps.forEach((b) => b.close());
    this.reverse.set(clip.sourceId, { in: clip.in, out: clip.out, fps: REVERSE_FPS, blobs, bitmaps: new Map(), pending: new Set(), last: null });
    this.requestDraw();
  }

  private reverseFrame(sourceId: string, time: number): ImageBitmap | null {
    const c = this.reverse.get(sourceId);
    if (!c) return null;
    const idx = Math.min(c.blobs.length - 1, Math.max(0, Math.round((time - c.in) * c.fps)));
    for (let d = -4; d <= 4; d++) this.decodeFrame(c, idx + d);
    const hit = c.bitmaps.get(idx);
    if (hit) {
      c.last = hit;
      return hit;
    }
    return c.last;
  }

  private decodeFrame(c: ReverseCache, i: number) {
    if (i < 0 || i >= c.blobs.length || c.bitmaps.has(i) || c.pending.has(i)) return;
    c.pending.add(i);
    void createImageBitmap(c.blobs[i])
      .then((bitmap) => {
        c.pending.delete(i);
        c.bitmaps.set(i, bitmap);
        while (c.bitmaps.size > 48) {
          const oldest = c.bitmaps.keys().next().value as number;
          const b = c.bitmaps.get(oldest);
          if (b && b !== c.last) b.close();
          c.bitmaps.delete(oldest);
        }
        this.requestDraw();
      })
      .catch(() => c.pending.delete(i));
  }

  /** Loads the on-device model that cuts people out of the background. */
  async enableBackgroundRemoval(onStatus: (m: string) => void): Promise<void> {
    if (!this.segmenter) this.segmenter = await loadSegmenter(onStatus);
    this.requestDraw();
  }
  get backgroundRemovalReady() {
    return this.segmenter !== null;
  }

  private chromaKey(source: CanvasImageSource, vw: number, vh: number, chroma: Chroma): HTMLCanvasElement | null {
    const k = Math.min(1, 640 / Math.max(vw, vh));
    const w = Math.max(2, Math.round(vw * k));
    const h = Math.max(2, Math.round(vh * k));
    const canvas = this.keyCanvas;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const kctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!kctx) return null;
    kctx.clearRect(0, 0, w, h);
    kctx.drawImage(source, 0, 0, w, h);
    const image = kctx.getImageData(0, 0, w, h);
    const d = image.data;
    const kr = parseInt(chroma.color.slice(1, 3), 16);
    const kg = parseInt(chroma.color.slice(3, 5), 16);
    const kb = parseInt(chroma.color.slice(5, 7), 16);
    const tol = (chroma.tolerance / 100) * 260 + 20;
    const inner = tol * 0.55;
    const greenKey = kg > kr && kg > kb;
    for (let i = 0; i < d.length; i += 4) {
      const dr = d[i] - kr;
      const dg = d[i + 1] - kg;
      const db = d[i + 2] - kb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < inner) d[i + 3] = 0;
      else if (dist < tol) {
        d[i + 3] = (255 * (dist - inner)) / (tol - inner);
        if (greenKey) d[i + 1] = Math.min(d[i + 1], Math.max(d[i], d[i + 2]));
      }
    }
    kctx.putImageData(image, 0, 0);
    return canvas;
  }

  /** Where the main clip is now, for the tracker. */
  mainNow(): { clip: Clip; sourceTime: number } | null {
    const found = locate(layout(this.project.clips), this.t);
    return found ? { clip: found.item.clip, sourceTime: found.sourceTime } : null;
  }

  /** Turns a spot on the preview (0..1 across and down) into a spot in the footage. */
  frameSpot(nx: number, ny: number): { x: number; y: number } | null {
    if (!this.lastMain) return null;
    return unmapPoint(this.lastMain, this.canvas.width, this.canvas.height, nx * this.canvas.width, ny * this.canvas.height);
  }

  /** Plays a sound effect once, so the visitor can hear it. */
  previewSfx(name: SfxName) {
    const graph = this.ensureAudio();
    void graph.ctx.resume();
    playSfx(graph.ctx, graph.sfx, name);
  }

  // ---- transport ----
  play() {
    if (!this.project.clips.length || this.playing) return;
    const graph = this.ensureAudio();
    void graph.ctx.resume();
    if (this.t >= this.total - 0.02) this.t = 0;
    this.playing = true;
    this.last = performance.now();
    this.prevT = this.t - 0.001;
    this.emit();
    this.requestDraw();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.syncMedia();
    this.emit();
    this.finish();
  }

  seek(t: number) {
    this.t = Math.min(Math.max(t, 0), this.total);
    this.prevT = this.t;
    this.requestDraw();
  }

  private finish() {
    const waiters = this.endWaiters;
    this.endWaiters = [];
    waiters.forEach((fn) => fn());
  }

  // ---- frame loop ----
  requestDraw() {
    if (!this.raf) this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    this.raf = 0;
    if (this.playing) {
      const dt = Math.min((now - this.last) / 1000, 0.25);
      this.last = now;
      this.t += dt;
      if (this.t >= this.total) {
        this.t = this.total;
        this.playing = false;
        this.emit();
        this.finish();
      }
      this.fireSfx();
    }
    this.syncMedia();
    drawFrame(this.ctx, this.buildScene());
    this.emit();
    if (this.playing) this.raf = requestAnimationFrame(this.loop);
  };

  private fireSfx() {
    if (this.audio) {
      for (const e of this.sfxEvents) {
        if (e.t > this.prevT && e.t <= this.t) playSfx(this.audio.ctx, this.audio.sfx, e.name);
      }
    }
    this.prevT = this.t;
  }

  /** Points every media element at the right moment. */
  private syncMedia() {
    const items = layout(this.project.clips);
    const found = locate(items, this.t);
    const active = new Set<HTMLMediaElement>();

    if (found) {
      const clip = found.item.clip;
      const rt = this.runtimes.get(clip.sourceId);
      if (rt?.el instanceof HTMLVideoElement) {
        const v = rt.el;
        active.add(v);
        const still = clip.freeze !== undefined || clip.reverse;
        if (rt.gain) {
          rt.gain.gain.value = still ? 0 : clip.volume;
          this.route(rt, `${clip.voice}|${clip.cleanVoice ? 1 : 0}`);
        }
        if (this.playing && !still) {
          v.playbackRate = Math.min(16, Math.max(0.0625, playbackRateAt(clip, found.local)));
          if (Math.abs(v.currentTime - found.sourceTime) > 0.3) v.currentTime = found.sourceTime;
          if (v.paused) void v.play().catch(() => undefined);
        } else {
          if (!v.paused) v.pause();
          if (!clip.reverse && Math.abs(v.currentTime - found.sourceTime) > 0.04) v.currentTime = found.sourceTime;
        }
      }
    }

    for (const layer of this.project.layers) {
      if (layer.kind !== "video") continue;
      const rt = this.runtimes.get(layer.sourceId);
      if (!(rt?.el instanceof HTMLVideoElement)) continue;
      const v = rt.el;
      v.muted = true;
      if (rt.gain) rt.gain.gain.value = 0;
      if (this.t >= layer.start && this.t < layer.end) {
        active.add(v);
        const want = layer.in + (this.t - layer.start);
        if (this.playing) {
          v.playbackRate = 1;
          if (Math.abs(v.currentTime - want) > 0.3) v.currentTime = want;
          if (v.paused) void v.play().catch(() => undefined);
        } else {
          if (!v.paused) v.pause();
          if (Math.abs(v.currentTime - want) > 0.04) v.currentTime = want;
        }
      }
    }

    for (const item of this.project.audio) {
      if (item.kind !== "music" || !item.sourceId) continue;
      const rt = this.runtimes.get(item.sourceId);
      if (!(rt?.el instanceof HTMLAudioElement)) continue;
      const a = rt.el;
      if (rt.gain) {
        rt.gain.gain.value = item.volume;
        this.route(rt, "none|0", "music");
      }
      const want = this.t - item.start;
      if (this.playing && want >= 0 && want < a.duration) {
        active.add(a);
        if (Math.abs(a.currentTime - want) > 0.3) a.currentTime = want;
        if (a.paused) void a.play().catch(() => undefined);
      }
    }

    this.runtimes.forEach((r) => {
      if (r.el && !active.has(r.el) && !r.el.paused) r.el.pause();
    });
  }

  private buildScene(): Scene {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const project = this.project;
    const items = layout(project.clips);
    const found = locate(items, this.t);
    let main: LayerDraw | null = null;
    let mainEl: CanvasImageSource | null = null;
    let blur = 0;

    if (found) {
      const { clip } = found.item;
      const rt = this.runtimes.get(clip.sourceId);
      if (rt) {
        const { source } = rt;
        let el: CanvasImageSource | null = null;
        if (clip.reverse && clip.freeze === undefined) el = this.reverseFrame(clip.sourceId, found.sourceTime);
        else if (rt.el instanceof HTMLVideoElement && rt.el.readyState >= 2) el = rt.el;
        mainEl = el;
        if (el && clip.removeBg && this.segmenter && rt.el instanceof HTMLVideoElement && !clip.reverse) {
          el = this.segmenter.cutout(rt.el) ?? el;
        } else if (el && clip.chroma.on) {
          el = this.chromaKey(el, source.width, source.height, clip.chroma) ?? el;
        }
        const tf = evalTransform(clip.tf, clip.keys, found.local);
        const [sx, sy] = clip.stabilize ? stabilizeAt(this.stab.get(clip.sourceId), found.sourceTime) : [0, 0];
        const adjust = clip.adjust ?? neutralAdjust;
        main = {
          el,
          w: source.width,
          h: source.height,
          fit: clip.fit,
          crop: { ...clip.crop, zoom: clip.crop.zoom * (clip.stabilize ? 1.07 : 1) },
          tf,
          adjust,
          mask: clip.mask ?? noMask,
          shift: { x: sx, y: sy },
          trans: this.transitionFor(items, found.index, found.local),
        };
        blur = clip.motionBlur / 100;
      }
    }
    this.lastMain = main;

    const layers: LayerDraw[] = [];
    for (const layer of project.layers) {
      if (this.t < layer.start || this.t >= layer.end) continue;
      const rt = this.runtimes.get(layer.sourceId);
      if (!rt) continue;
      const el = layer.kind === "image" ? rt.image : rt.el instanceof HTMLVideoElement && rt.el.readyState >= 2 ? rt.el : null;
      let tf = evalTransform(layer.tf, layer.keys, this.t - layer.start);
      if (layer.follow && main && found) {
        const p = this.followPoint(layer.follow, main, found.item.clip.sourceId, found.sourceTime, W, H);
        if (p) tf = { ...tf, x: (p.x - W / 2) / W, y: (p.y - H / 2) / H };
      }
      layers.push({
        el,
        w: rt.source.width,
        h: rt.source.height,
        fit: "fit",
        crop: { zoom: 1, x: 0, y: 0 },
        tf,
        adjust: neutralAdjust,
        mask: layer.mask ?? noMask,
        shift: { x: 0, y: 0 },
        widthFrac: layer.width,
        trans: noTrans,
      });
    }

    const textAt: Record<string, { x: number; y: number }> = {};
    for (const text of project.texts) {
      if (text.follow && main && found) {
        const p = this.followPoint(text.follow, main, found.item.clip.sourceId, found.sourceTime, W, H);
        if (p) textAt[text.id] = p;
      }
    }

    const bgSource = project.background.imageSourceId ? this.runtimes.get(project.background.imageSourceId)?.image ?? null : null;
    return {
      width: W,
      height: H,
      project,
      t: this.t,
      playing: this.playing,
      main,
      mainVideo: mainEl,
      motionBlur: blur,
      layers,
      textAt,
      logo: this.logo,
      bgImage: bgSource,
      scratch: this.scratch,
    };
  }

  private followPoint(
    track: { sourceId: string; t0: number; fps: number; points: [number, number][] },
    main: LayerDraw,
    mainSourceId: string,
    sourceTime: number,
    W: number,
    H: number,
  ) {
    if (track.sourceId !== mainSourceId) return null;
    const p = trackAt(track, sourceTime);
    return p ? mapPoint(main, W, H, p[0], p[1]) : null;
  }

  /** Fade, wipe, zoom or slide where one clip meets another. Half happens on each side of the cut. */
  private transitionFor(items: ReturnType<typeof layout>, index: number, local: number) {
    const item = items[index];
    const len = item.end - item.start;
    let vis = 1;
    let out = false;
    let type = "none";
    const inT = item.clip.transition;
    if (index > 0 && inT.type !== "none") {
      const half = Math.min(inT.duration / 2, len * 0.45);
      if (local < half) {
        vis = local / half;
        type = inT.type;
      }
    }
    const next = items[index + 1];
    if (type === "none" && next && next.clip.transition.type !== "none") {
      const half = Math.min(next.clip.transition.duration / 2, len * 0.45);
      const remaining = len - local;
      if (remaining < half) {
        vis = remaining / half;
        type = next.clip.transition.type;
        out = true;
      }
    }
    const t = { ...noTrans };
    if (type === "fade") t.alpha = vis;
    else if (type === "zoom") {
      t.alpha = vis;
      t.scale = 1 + (1 - vis) * 0.3;
    } else if (type === "wipe") t.wipe = vis;
    else if (type === "slide") t.dx = (out ? -1 : 1) * (1 - vis);
    else if (type === "slideUp") t.dy = (out ? -1 : 1) * (1 - vis);
    else if (type === "wipeDown") t.wipeV = vis;
    else if (type === "spin") {
      t.alpha = vis;
      t.scale = 0.6 + 0.4 * vis;
      t.rot = (out ? -1 : 1) * (1 - vis) * 0.6;
    } else if (type === "flash") t.flash = 1 - vis;
    else if (type === "shake") {
      t.dx = Math.sin(local * 70) * 0.035 * (1 - vis);
      t.dy = Math.cos(local * 53) * 0.02 * (1 - vis);
      t.alpha = 0.5 + 0.5 * vis;
    }
    return t;
  }

  // ---- export ----
  async exportVideo(onProgress: (fraction: number) => void, mode: "video" | "audio" = "video"): Promise<{ blob: Blob; extension: string }> {
    if (!this.project.clips.length) throw new Error("Add a video first.");
    if (typeof MediaRecorder === "undefined") throw new Error("This browser cannot export.");
    this.pause();
    const graph = this.ensureAudio();
    await graph.ctx.resume();
    const mimeType = (mode === "audio" ? AUDIO_MIME : VIDEO_MIME).find((m) => MediaRecorder.isTypeSupported(m));
    if (!mimeType) throw new Error("This browser cannot export.");

    this.cancelled = false;
    this.busyExporting = true;
    this.emit();
    // Silence the speakers while recording. The recorder keeps its own audio feed.
    graph.master.disconnect(graph.ctx.destination);

    const tracks = mode === "audio" ? graph.rec.stream.getAudioTracks() : [...this.canvas.captureStream(30).getVideoTracks(), ...graph.rec.stream.getAudioTracks()];
    const stream = new MediaStream(tracks);
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, mode === "audio" ? { mimeType } : { mimeType, videoBitsPerSecond: this.quality === "1080" ? 8_000_000 : 5_000_000 });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const unsubscribe = this.subscribe(() => {
      if (this.total) onProgress(Math.min(this.t / this.total, 1));
    });
    try {
      this.seek(0);
      await wait(500);
      recorder.start(500);
      const ended = new Promise<void>((resolve) => this.endWaiters.push(resolve));
      this.play();
      await ended;
      await wait(300);
      if (this.cancelled) throw new Error("Export cancelled.");
    } finally {
      unsubscribe();
      if (recorder.state !== "inactive") recorder.stop();
      await stopped;
      graph.master.connect(graph.ctx.destination);
      this.busyExporting = false;
      this.emit();
    }
    const base = mimeType.split(";")[0];
    const extension = mode === "audio" ? (base === "audio/mp4" ? "m4a" : "webm") : base === "video/mp4" ? "mp4" : "webm";
    return { blob: new Blob(chunks, { type: base }), extension };
  }

  cancelExport() {
    this.cancelled = true;
    this.pause();
    this.finish();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.playing = false;
    this.runtimes.forEach((r) => {
      r.el?.pause();
      URL.revokeObjectURL(r.source.url);
    });
    this.reverse.forEach((c) => c.bitmaps.forEach((b) => b.close()));
    this.segmenter?.close();
    this.runtimes.clear();
    void this.audio?.ctx.close();
    this.listeners.clear();
  }
}
