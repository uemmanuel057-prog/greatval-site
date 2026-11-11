import { layout, locate, newId, totalDuration } from "./project";
import { drawFrame } from "./render";
import { canvasSize, initialProject, type Project, type QualityId, type Source } from "./types";

interface Runtime {
  source: Source;
  video: HTMLVideoElement;
  gain?: GainNode;
}

interface AudioGraph {
  ctx: AudioContext;
  master: GainNode;
  /** Feeds the recorder. Connected only to the exporter, never to speakers. */
  rec: MediaStreamAudioDestinationNode;
}

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Plays and exports the project in the browser. It keeps one hidden video per
 * source, paints the current frame to a canvas, and mixes audio with Web Audio.
 * React only talks to it through a few methods and two subscribable values.
 */
export class StudioEngine {
  private ctx: CanvasRenderingContext2D;
  private project: Project = initialProject;
  private quality: QualityId = "720";
  private runtimes = new Map<string, Runtime>();
  private t = 0;
  private playing = false;
  private last = 0;
  private raf = 0;
  private listeners = new Set<() => void>();
  private audio: AudioGraph | null = null;
  private logo: HTMLImageElement;
  private endWaiters: Array<() => void> = [];
  private cancelled = false;
  private busyExporting = false;

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
    this.requestDraw();
  }

  setQuality(quality: QualityId) {
    this.quality = quality;
    this.applySize();
    this.requestDraw();
  }

  async addSource(file: File): Promise<Source> {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.src = url;
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("This file could not be read as a video."));
      });
      if (!video.videoWidth) throw new Error("This file has no video.");
      if (!Number.isFinite(video.duration)) {
        // Some recorded files do not store their length. Seeking far ahead makes the browser work it out.
        await new Promise<void>((resolve) => {
          video.ontimeupdate = () => {
            video.ontimeupdate = null;
            resolve();
          };
          video.currentTime = 1e7;
        });
      }
      video.currentTime = 0.001;
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
    video.addEventListener("seeked", () => this.requestDraw());
    video.addEventListener("loadeddata", () => this.requestDraw());
    const source: Source = {
      id: newId("src"),
      name: file.name,
      url,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
    const runtime: Runtime = { source, video };
    this.runtimes.set(source.id, runtime);
    if (this.audio) this.connect(runtime);
    return source;
  }

  // ---- audio ----
  private ensureAudio(): AudioGraph {
    if (this.audio) return this.audio;
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const rec = ctx.createMediaStreamDestination();
    master.connect(rec);
    this.audio = { ctx, master, rec };
    this.runtimes.forEach((r) => this.connect(r));
    return this.audio;
  }

  private connect(runtime: Runtime) {
    if (!this.audio || runtime.gain) return;
    const node = this.audio.ctx.createMediaElementSource(runtime.video);
    const gain = this.audio.ctx.createGain();
    node.connect(gain);
    gain.connect(this.audio.master);
    runtime.gain = gain;
  }

  // ---- transport ----
  play() {
    if (!this.project.clips.length || this.playing) return;
    const graph = this.ensureAudio();
    void graph.ctx.resume();
    if (this.t >= this.total - 0.02) this.t = 0;
    this.playing = true;
    this.last = performance.now();
    this.emit();
    this.requestDraw();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.sync();
    this.emit();
    this.finish();
  }

  seek(t: number) {
    this.t = Math.min(Math.max(t, 0), this.total);
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
    }
    const active = this.sync();
    drawFrame(this.ctx, {
      width: this.canvas.width,
      height: this.canvas.height,
      project: this.project,
      t: this.t,
      video: active,
      logo: this.logo,
    });
    this.emit();
    if (this.playing) this.raf = requestAnimationFrame(this.loop);
  };

  /** Points the right video at the right moment and returns it. */
  private sync(): HTMLVideoElement | null {
    const found = locate(layout(this.project.clips), this.t);
    let active: Runtime | undefined;
    if (found) {
      active = this.runtimes.get(found.item.clip.sourceId);
      if (active) {
        const v = active.video;
        const clip = found.item.clip;
        if (active.gain) active.gain.gain.value = clip.volume;
        if (this.playing) {
          v.playbackRate = clip.speed;
          if (Math.abs(v.currentTime - found.sourceTime) > 0.3) v.currentTime = found.sourceTime;
          if (v.paused) void v.play().catch(() => undefined);
        } else {
          if (!v.paused) v.pause();
          if (Math.abs(v.currentTime - found.sourceTime) > 0.04) v.currentTime = found.sourceTime;
        }
      }
    }
    this.runtimes.forEach((r) => {
      if (r !== active && !r.video.paused) r.video.pause();
    });
    return active?.video ?? null;
  }

  // ---- export ----
  async exportVideo(onProgress: (fraction: number) => void): Promise<{ blob: Blob; extension: string }> {
    if (!this.project.clips.length) throw new Error("Add a video first.");
    if (typeof MediaRecorder === "undefined") throw new Error("This browser cannot export video.");
    this.pause();
    const graph = this.ensureAudio();
    await graph.ctx.resume();
    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
    if (!mimeType) throw new Error("This browser cannot export video.");

    this.cancelled = false;
    this.busyExporting = true;
    this.emit();
    // Silence the speakers while recording. The recorder keeps its own audio feed.
    graph.master.disconnect(graph.ctx.destination);

    const stream = new MediaStream([
      ...this.canvas.captureStream(30).getVideoTracks(),
      ...graph.rec.stream.getAudioTracks(),
    ]);
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: this.quality === "1080" ? 8_000_000 : 5_000_000,
    });
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
    return { blob: new Blob(chunks, { type: mimeType.split(";")[0] }), extension: mimeType.startsWith("video/mp4") ? "mp4" : "webm" };
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
      r.video.pause();
      URL.revokeObjectURL(r.source.url);
    });
    this.runtimes.clear();
    void this.audio?.ctx.close();
    this.listeners.clear();
  }
}
