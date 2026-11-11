import type { Project, TextLayer } from "./types";

export const BRAND = { canvas: "#0B0F17", gold: "#E5A93C", ink: "#F8FAFC", muted: "#94A3B8" };

const FONT = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const sizeFactor = { s: 0.055, m: 0.078, l: 0.105 } as const;
const yFactor = { top: 0.14, middle: 0.5, bottom: 0.7 } as const;

export interface FrameState {
  width: number;
  height: number;
  project: Project;
  /** Timeline time in seconds. */
  t: number;
  video: HTMLVideoElement | null;
  logo: HTMLImageElement | null;
}

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

function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer, w: number, h: number, short: number) {
  const size = Math.round(short * sizeFactor[layer.size]);
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrap(ctx, layer.text, w * 0.84);
  const lineH = size * 1.2;
  const top = h * yFactor[layer.position] - ((lines.length - 1) * lineH) / 2;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(4, size * 0.16);
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.fillStyle = layer.color === "gold" ? BRAND.gold : "#FFFFFF";
  lines.forEach((line, i) => {
    const y = top + i * lineH;
    ctx.strokeText(line, w / 2, y);
    ctx.fillText(line, w / 2, y);
  });
}

/** Draws one frame: background, video (filling the frame), text and overlays. */
export function drawFrame(ctx: CanvasRenderingContext2D, s: FrameState) {
  const { width: w, height: h, project, t, video, logo } = s;
  const short = Math.min(w, h);
  ctx.save();
  ctx.fillStyle = BRAND.canvas;
  ctx.fillRect(0, 0, w, h);

  if (video && video.readyState >= 2 && video.videoWidth) {
    const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
    const dw = video.videoWidth * scale;
    const dh = video.videoHeight * scale;
    ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  for (const layer of project.texts) {
    if (layer.text.trim() && t >= layer.start && t < layer.end) drawText(ctx, layer, w, h, short);
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

  if (overlays.watermark && logo && logo.complete && logo.naturalWidth) {
    const lw = short * 0.17;
    const lh = (lw * logo.naturalHeight) / logo.naturalWidth;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(logo, w - lw - short * 0.04, short * 0.04, lw, lh);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
