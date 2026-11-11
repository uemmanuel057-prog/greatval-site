import type { Adjust, Background, CaptionStyle, CaptionWord, Mask, Project, TextLayer, Transform } from "./types";

export const BRAND = { canvas: "#0B0F17", gold: "#E5A93C", ink: "#F8FAFC", muted: "#94A3B8", cyan: "#38BDF8" };

const FONT = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

const sizeFactor = { s: 0.055, m: 0.078, l: 0.105 } as const;
const yFactor = { top: 0.14, middle: 0.5, bottom: 0.7 } as const;

// ---- layers (video, image, picture in picture) ----

export interface LayerDraw {
  el: CanvasImageSource | null;
  w: number;
  h: number;
  fit: "fill" | "fit";
  crop: { zoom: number; x: number; y: number };
  tf: Transform;
  adjust: Adjust;
  mask: Mask;
  /** Extra shift as a fraction of the canvas (stabilization). */
  shift: { x: number; y: number };
  /** Width as a fraction of the canvas. Used by overlays instead of fit. */
  widthFrac?: number;
  trans: { alpha: number; scale: number; wipe: number; dx: number };
}

export const noTrans = { alpha: 1, scale: 1, wipe: 1, dx: 0 };

interface Geometry {
  cx: number;
  cy: number;
  dw: number;
  dh: number;
  scale: number;
  rot: number;
}

export function layerGeometry(L: LayerDraw, W: number, H: number): Geometry {
  let dw: number;
  let dh: number;
  if (L.widthFrac) {
    dw = W * L.widthFrac;
    dh = (dw * L.h) / L.w;
  } else {
    const s = L.fit === "fill" ? Math.max(W / L.w, H / L.h) : Math.min(W / L.w, H / L.h);
    dw = L.w * s * L.crop.zoom;
    dh = L.h * s * L.crop.zoom;
  }
  const panX = -L.crop.x * W * ((L.crop.zoom - 1) / 2);
  const panY = -L.crop.y * H * ((L.crop.zoom - 1) / 2);
  return {
    cx: W / 2 + panX + (L.tf.x + L.shift.x) * W + L.trans.dx * W,
    cy: H / 2 + panY + (L.tf.y + L.shift.y) * H,
    dw,
    dh,
    scale: L.tf.scale * L.trans.scale,
    rot: (L.tf.rotation * Math.PI) / 180,
  };
}

/** Where a point of the frame (0..1 across and down) lands on the canvas. */
export function mapPoint(L: LayerDraw, W: number, H: number, nx: number, ny: number): { x: number; y: number } {
  const g = layerGeometry(L, W, H);
  const lx = (nx - 0.5) * g.dw * g.scale;
  const ly = (ny - 0.5) * g.dh * g.scale;
  return { x: g.cx + lx * Math.cos(g.rot) - ly * Math.sin(g.rot), y: g.cy + lx * Math.sin(g.rot) + ly * Math.cos(g.rot) };
}

/** The reverse of mapPoint: a canvas point back to a place in the frame. */
export function unmapPoint(L: LayerDraw, W: number, H: number, x: number, y: number): { x: number; y: number } {
  const g = layerGeometry(L, W, H);
  const dx = x - g.cx;
  const dy = y - g.cy;
  const lx = dx * Math.cos(-g.rot) - dy * Math.sin(-g.rot);
  const ly = dx * Math.sin(-g.rot) + dy * Math.cos(-g.rot);
  return { x: lx / (g.dw * g.scale) + 0.5, y: ly / (g.dh * g.scale) + 0.5 };
}

export function filterString(a: Adjust): string {
  const parts: string[] = [];
  const b = (1 + a.brightness / 100) * (1 + (a.exposure / 100) * 0.6) + (a.fade / 100) * 0.1;
  const c = 1 + a.contrast / 100 - (a.fade / 100) * 0.3;
  const s = 1 + a.saturation / 100 - (a.fade / 100) * 0.25;
  if (b !== 1) parts.push(`brightness(${Math.max(b, 0).toFixed(3)})`);
  if (c !== 1) parts.push(`contrast(${Math.max(c, 0).toFixed(3)})`);
  if (s !== 1) parts.push(`saturate(${Math.max(s, 0).toFixed(3)})`);
  if (a.warmth > 0) parts.push(`sepia(${((a.warmth / 100) * 0.5).toFixed(3)})`);
  if (a.warmth < 0) parts.push(`hue-rotate(${(-a.warmth * 0.4).toFixed(1)}deg)`);
  if (a.tint) parts.push(`hue-rotate(${(a.tint * 0.5).toFixed(1)}deg)`);
  if (a.grayscale) parts.push("grayscale(1)");
  return parts.length ? parts.join(" ") : "none";
}

function maskPath(ctx: CanvasRenderingContext2D, m: Mask, dw: number, dh: number) {
  ctx.beginPath();
  if (m.invert) ctx.rect(-dw * 2, -dh * 2, dw * 4, dh * 4);
  if (m.shape === "circle") {
    const r = (Math.min(dw, dh) / 2) * m.size;
    ctx.moveTo(r, 0);
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else if (m.shape === "rectangle") {
    const w = dw * m.size;
    const h = dh * m.size;
    ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.08);
  } else if (m.shape === "linear") {
    ctx.rect(-dw / 2, -dh / 2, dw * m.size, dh);
  }
}

let filterOk: boolean | null = null;
export function supportsFilter(ctx: CanvasRenderingContext2D): boolean {
  if (filterOk === null) filterOk = "filter" in ctx && typeof ctx.filter === "string";
  return filterOk;
}

export function paintLayer(ctx: CanvasRenderingContext2D, L: LayerDraw, W: number, H: number) {
  if (!L.el) return;
  const alpha = Math.min(Math.max(L.tf.opacity * L.trans.alpha, 0), 1);
  if (alpha <= 0) return;
  const g = layerGeometry(L, W, H);
  ctx.save();
  if (L.trans.wipe < 1) {
    ctx.beginPath();
    ctx.rect(0, 0, W * L.trans.wipe, H);
    ctx.clip();
  }
  ctx.globalAlpha = alpha;
  ctx.translate(g.cx, g.cy);
  ctx.rotate(g.rot);
  ctx.scale(g.scale, g.scale);
  if (L.mask.shape !== "none") {
    maskPath(ctx, L.mask, g.dw, g.dh);
    ctx.clip(L.mask.invert ? "evenodd" : "nonzero");
  }
  const f = filterString(L.adjust);
  if (f !== "none" && supportsFilter(ctx)) ctx.filter = f;
  ctx.drawImage(L.el, -g.dw / 2, -g.dh / 2, g.dw, g.dh);
  ctx.filter = "none";
  if (L.adjust.vignette > 0) {
    const r = Math.hypot(g.dw, g.dh) / 2;
    const grad = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(L.adjust.vignette / 100, 1) * 0.85})`);
    ctx.fillStyle = grad;
    ctx.fillRect(-g.dw / 2, -g.dh / 2, g.dw, g.dh);
  }
  ctx.restore();
}

// ---- background ----

export interface Scratch {
  layer: HTMLCanvasElement;
  trail: HTMLCanvasElement;
  small: HTMLCanvasElement;
}

export function makeScratch(): Scratch {
  return { layer: document.createElement("canvas"), trail: document.createElement("canvas"), small: document.createElement("canvas") };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  bg: Background,
  videoEl: CanvasImageSource | null,
  videoSize: { w: number; h: number },
  image: HTMLImageElement | null,
  scratch: Scratch,
) {
  ctx.fillStyle = bg.kind === "color" ? bg.color : BRAND.canvas;
  ctx.fillRect(0, 0, W, H);
  if (bg.kind === "glow") {
    const a = ctx.createRadialGradient(W * 0.2, H * 0.12, 0, W * 0.2, H * 0.12, Math.max(W, H) * 0.7);
    a.addColorStop(0, "rgba(229,169,60,0.34)");
    a.addColorStop(1, "rgba(229,169,60,0)");
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, W, H);
    const b = ctx.createRadialGradient(W * 0.88, H * 0.92, 0, W * 0.88, H * 0.92, Math.max(W, H) * 0.65);
    b.addColorStop(0, "rgba(56,189,248,0.26)");
    b.addColorStop(1, "rgba(56,189,248,0)");
    ctx.fillStyle = b;
    ctx.fillRect(0, 0, W, H);
  } else if (bg.kind === "blur" && videoEl && videoSize.w) {
    // Drawing tiny and stretching back up blurs the picture on every browser, quickly.
    const sw = 40;
    const sh = Math.max(24, Math.round((sw * H) / W));
    scratch.small.width = sw;
    scratch.small.height = sh;
    const s = scratch.small.getContext("2d");
    if (s) {
      const k = Math.max(sw / videoSize.w, sh / videoSize.h);
      s.drawImage(videoEl, (sw - videoSize.w * k) / 2, (sh - videoSize.h * k) / 2, videoSize.w * k, videoSize.h * k);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(scratch.small, 0, 0, W, H);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, W, H);
    }
  } else if (bg.kind === "image" && image && image.complete && image.naturalWidth) {
    const k = Math.max(W / image.naturalWidth, H / image.naturalHeight);
    ctx.drawImage(image, (W - image.naturalWidth * k) / 2, (H - image.naturalHeight * k) / 2, image.naturalWidth * k, image.naturalHeight * k);
  }
}

// ---- text ----

/** Splits text into lines that fit a width. Explicit line breaks are kept. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer, w: number, h: number, short: number, at?: { x: number; y: number }) {
  const size = Math.round(short * sizeFactor[layer.size]);
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrap(ctx, layer.text, w * 0.84);
  const lineH = size * 1.2;
  const cy = at ? at.y : h * yFactor[layer.position];
  const cx = at ? at.x : w / 2;
  const top = cy - ((lines.length - 1) * lineH) / 2;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(4, size * 0.16);
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.fillStyle = layer.color === "gold" ? BRAND.gold : "#FFFFFF";
  lines.forEach((line, i) => {
    const y = top + i * lineH;
    ctx.strokeText(line, cx, y);
    ctx.fillText(line, cx, y);
  });
}

/** Groups caption words into short lines that are shown one at a time. */
export function captionLines(words: CaptionWord[], maxWords = 4): CaptionWord[][] {
  const lines: CaptionWord[][] = [];
  let line: CaptionWord[] = [];
  words.forEach((word, i) => {
    const prev = words[i - 1];
    if (line.length && (line.length >= maxWords || word.start - prev.end > 0.8)) {
      lines.push(line);
      line = [];
    }
    line.push(word);
  });
  if (line.length) lines.push(line);
  return lines;
}

function drawCaption(ctx: CanvasRenderingContext2D, line: CaptionWord[], t: number, style: CaptionStyle, w: number, h: number, short: number) {
  const serif = style === "serif";
  const size = Math.round(short * (serif ? 0.05 : 0.07));
  ctx.font = serif ? `italic 600 ${size}px ${SERIF}` : `800 ${size}px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const words = line.map((x) => (serif ? x.text : x.text.toUpperCase()));
  const space = ctx.measureText(" ").width;
  const widths = words.map((x) => ctx.measureText(x).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  const y = h * (serif ? 0.84 : 0.7);
  let x = (w - total) / 2;
  if (style === "box") {
    const padX = size * 0.5;
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.beginPath();
    ctx.roundRect(x - padX, y - size * 0.85, total + padX * 2, size * 1.7, size * 0.35);
    ctx.fill();
  }
  ctx.lineJoin = "round";
  words.forEach((word, i) => {
    const active = t >= line[i].start && t < line[i].end;
    if (style === "box" && active) {
      ctx.fillStyle = BRAND.gold;
      ctx.beginPath();
      ctx.roundRect(x - size * 0.12, y - size * 0.62, widths[i] + size * 0.24, size * 1.24, size * 0.2);
      ctx.fill();
    }
    if (style === "serif") {
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = size * 0.3;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(word, x, y);
      ctx.shadowBlur = 0;
    } else {
      if (style === "gold") {
        ctx.lineWidth = Math.max(4, size * 0.18);
        ctx.strokeStyle = "rgba(0,0,0,0.75)";
        ctx.strokeText(word, x, y);
      }
      ctx.fillStyle = style === "box" ? (active ? BRAND.canvas : "#FFFFFF") : active ? BRAND.gold : "#FFFFFF";
      ctx.fillText(word, x, y);
    }
    x += widths[i] + space;
  });
}

// ---- the whole frame ----

export interface Scene {
  width: number;
  height: number;
  project: Project;
  /** Timeline time in seconds. */
  t: number;
  playing: boolean;
  main: LayerDraw | null;
  mainVideo: CanvasImageSource | null;
  motionBlur: number; // 0..1
  layers: LayerDraw[];
  /** Where followed text sits, by layer id. */
  textAt: Record<string, { x: number; y: number }>;
  logo: HTMLImageElement | null;
  bgImage: HTMLImageElement | null;
  scratch: Scratch;
}

/** Draws one frame: background, footage, picture in picture, text, captions and overlays. */
export function drawFrame(ctx: CanvasRenderingContext2D, s: Scene) {
  const { width: w, height: h, project, t, main } = s;
  const short = Math.min(w, h);
  ctx.save();
  ctx.globalAlpha = 1;
  drawBackground(ctx, w, h, project.background, s.mainVideo, { w: main?.w ?? 0, h: main?.h ?? 0 }, s.bgImage, s.scratch);

  if (main && main.el) {
    if (s.motionBlur > 0 && s.playing) {
      const { layer, trail } = s.scratch;
      if (layer.width !== w || layer.height !== h) {
        layer.width = w;
        layer.height = h;
        trail.width = w;
        trail.height = h;
      }
      const lc = layer.getContext("2d");
      const tc = trail.getContext("2d");
      if (lc && tc) {
        lc.clearRect(0, 0, w, h);
        paintLayer(lc, main, w, h);
        tc.globalAlpha = Math.max(0.28, 1 - s.motionBlur * 0.72);
        tc.drawImage(layer, 0, 0);
        tc.globalAlpha = 1;
        ctx.drawImage(trail, 0, 0);
      }
    } else {
      if (s.scratch.trail.width) s.scratch.trail.getContext("2d")?.clearRect(0, 0, s.scratch.trail.width, s.scratch.trail.height);
      paintLayer(ctx, main, w, h);
    }
  }

  for (const layer of s.layers) paintLayer(ctx, layer, w, h);

  for (const layer of project.texts) {
    if (layer.text.trim() && t >= layer.start && t < layer.end) drawText(ctx, layer, w, h, short, s.textAt[layer.id]);
  }

  if (project.captions.length) {
    const line = captionLines(project.captions).find((l) => t >= l[0].start && t < l[l.length - 1].end + 0.15);
    if (line) drawCaption(ctx, line, t, project.captionStyle, w, h, short);
  }

  const { overlays } = project;
  if (overlays.lowerThird.on && (overlays.lowerThird.title || overlays.lowerThird.subtitle)) {
    const x = short * 0.06;
    const titleSize = Math.round(short * 0.058);
    const subSize = Math.round(short * 0.036);
    const blockH = titleSize + (overlays.lowerThird.subtitle ? subSize * 1.5 : 0);
    const y = h * 0.8;
    ctx.fillStyle = BRAND.gold;
    ctx.fillRect(x, y - titleSize * 0.5, Math.max(4, short * 0.008), blockH);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = short * 0.015;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 ${titleSize}px ${FONT}`;
    ctx.fillText(overlays.lowerThird.title, x + short * 0.022, y);
    if (overlays.lowerThird.subtitle) {
      ctx.fillStyle = BRAND.gold;
      ctx.font = `600 ${subSize}px ${FONT}`;
      ctx.fillText(overlays.lowerThird.subtitle, x + short * 0.022, y + titleSize * 0.95);
    }
    ctx.shadowBlur = 0;
  }

  if (overlays.banner.on && overlays.banner.text.trim()) {
    const size = Math.round(short * 0.04);
    ctx.font = `700 ${size}px ${FONT}`;
    const text = overlays.banner.text.trim();
    const padX = size * 0.9;
    const pillW = ctx.measureText(text).width + padX * 2;
    const pillH = size * 1.9;
    const x = (w - pillW) / 2;
    const y = h * 0.92 - pillH / 2;
    ctx.fillStyle = BRAND.gold;
    ctx.beginPath();
    ctx.roundRect(x, y, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = BRAND.canvas;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, y + pillH / 2 + size * 0.04);
  }

  if (overlays.watermark && s.logo && s.logo.complete && s.logo.naturalWidth) {
    const lw = short * 0.17;
    const lh = (lw * s.logo.naturalHeight) / s.logo.naturalWidth;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(s.logo, w - lw - short * 0.04, short * 0.04, lw, lh);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
