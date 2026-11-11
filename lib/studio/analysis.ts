/**
 * Motion analysis for stabilizing and tracking. It reads the footage in small grey frames,
 * so it stays light on phones. It uses its own hidden video, so the preview is not disturbed.
 */

export interface Grabber {
  w: number;
  h: number;
  grab: (t: number) => Promise<Uint8ClampedArray>;
  dispose: () => void;
}

export async function makeGrabber(url: string, maxSide: number): Promise<Grabber> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Could not read the video for analysis."));
  });
  const k = maxSide / Math.max(video.videoWidth, video.videoHeight);
  const w = Math.max(16, Math.round(video.videoWidth * k));
  const h = Math.max(16, Math.round(video.videoHeight * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  return {
    w,
    h,
    grab: async (t) => {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2000);
        video.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        video.currentTime = Math.max(0, t);
      });
      ctx.drawImage(video, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const gray = new Uint8ClampedArray(w * h);
      for (let i = 0; i < gray.length; i++) gray[i] = (data[i * 4] * 77 + data[i * 4 + 1] * 150 + data[i * 4 + 2] * 29) >> 8;
      return gray;
    },
    dispose: () => {
      video.removeAttribute("src");
      video.load();
    },
  };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export interface StabilizeData {
  t0: number;
  fps: number;
  /** Correction per frame, as fractions of the frame width and height. */
  corr: [number, number][];
}

/** How far the picture moved between two frames, in pixels, found by block matching. */
function globalShift(prev: Uint8ClampedArray, cur: Uint8ClampedArray, w: number, h: number): [number, number] {
  const R = 6;
  const x0 = Math.round(w * 0.18);
  const x1 = Math.round(w * 0.82);
  const y0 = Math.round(h * 0.18);
  const y1 = Math.round(h * 0.82);
  const cost = new Float64Array((2 * R + 1) ** 2);
  let best = Infinity;
  let bu = 0;
  let bv = 0;
  for (let v = -R; v <= R; v++) {
    for (let u = -R; u <= R; u++) {
      let sad = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 2) {
        const row = y * w;
        const row2 = (y + v) * w;
        for (let x = x0; x < x1; x += 2) {
          sad += Math.abs(prev[row + x] - cur[row2 + x + u]);
          n++;
        }
      }
      sad /= n;
      cost[(v + R) * (2 * R + 1) + (u + R)] = sad;
      if (sad < best) {
        best = sad;
        bu = u;
        bv = v;
      }
    }
  }
  const at = (u: number, v: number) => cost[(v + R) * (2 * R + 1) + (u + R)];
  const parabola = (m: number, c: number, p: number) => {
    const d = m - 2 * c + p;
    return d > 1e-6 ? (m - p) / (2 * d) : 0;
  };
  const su = bu > -R && bu < R ? parabola(at(bu - 1, bv), at(bu, bv), at(bu + 1, bv)) : 0;
  const sv = bv > -R && bv < R ? parabola(at(bu, bv - 1), at(bu, bv), at(bu, bv + 1)) : 0;
  // The matched offset tells where the old picture went, so the picture's own movement is the same offset.
  return [bu + su, bv + sv];
}

export async function analyzeStabilize(
  url: string,
  from: number,
  to: number,
  onProgress: (f: number) => void,
  isCancelled: () => boolean,
): Promise<StabilizeData> {
  const fps = 12;
  const g = await makeGrabber(url, 192);
  try {
    const count = Math.max(2, Math.floor((to - from) * fps) + 1);
    const path: [number, number][] = [[0, 0]];
    let prev = await g.grab(from);
    for (let i = 1; i < count; i++) {
      if (isCancelled()) throw new Error("Cancelled.");
      const cur = await g.grab(from + i / fps);
      const [u, v] = globalShift(prev, cur, g.w, g.h);
      const last = path[i - 1];
      path.push([last[0] + u / g.w, last[1] + v / g.h]);
      prev = cur;
      onProgress(i / count);
      if (i % 4 === 0) await tick();
    }
    const radius = Math.round(fps * 0.6);
    const corr = path.map((p, i) => {
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (let k = Math.max(0, i - radius); k <= Math.min(count - 1, i + radius); k++) {
        sx += path[k][0];
        sy += path[k][1];
        n++;
      }
      return [sx / n - p[0], sy / n - p[1]] as [number, number];
    });
    return { t0: from, fps, corr };
  } finally {
    g.dispose();
  }
}

/** The correction at a source time, blended between analysed frames. Zero outside the analysed range. */
export function stabilizeAt(d: StabilizeData | undefined, sourceTime: number): [number, number] {
  if (!d) return [0, 0];
  const f = (sourceTime - d.t0) * d.fps;
  if (f < 0 || f > d.corr.length - 1) return [0, 0];
  const i = Math.floor(f);
  const a = d.corr[i];
  const b = d.corr[Math.min(i + 1, d.corr.length - 1)];
  const u = f - i;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

/** Follows one point through the footage, starting at `from`, by matching a small patch of picture. */
export async function trackPoint(
  url: string,
  sourceId: string,
  from: number,
  to: number,
  start: { x: number; y: number },
  onProgress: (f: number) => void,
  isCancelled: () => boolean,
): Promise<{ sourceId: string; t0: number; fps: number; points: [number, number][] }> {
  const fps = 15;
  const g = await makeGrabber(url, 256);
  try {
    const P = 8; // patch half size
    const S = 14; // search radius
    const count = Math.max(2, Math.floor((to - from) * fps) + 1);
    let cx = Math.min(Math.max(Math.round(start.x * g.w), P + S), g.w - P - S - 1);
    let cy = Math.min(Math.max(Math.round(start.y * g.h), P + S), g.h - P - S - 1);
    const size = 2 * P + 1;
    const template = new Float32Array(size * size);
    const readPatch = (frame: Uint8ClampedArray, x: number, y: number, out: Float32Array, blend: number) => {
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          const val = frame[(y - P + j) * g.w + (x - P + i)];
          out[j * size + i] = blend >= 1 ? val : out[j * size + i] * (1 - blend) + val * blend;
        }
      }
    };
    let frame = await g.grab(from);
    readPatch(frame, cx, cy, template, 1);
    const points: [number, number][] = [[cx / g.w, cy / g.h]];
    let lost = false;
    for (let i = 1; i < count; i++) {
      if (isCancelled()) throw new Error("Cancelled.");
      frame = await g.grab(from + i / fps);
      if (!lost) {
        let best = Infinity;
        let bx = cx;
        let by = cy;
        for (let v = -S; v <= S; v++) {
          const y = cy + v;
          if (y < P || y >= g.h - P) continue;
          for (let u = -S; u <= S; u++) {
            const x = cx + u;
            if (x < P || x >= g.w - P) continue;
            let sad = 0;
            for (let j = 0; j < size; j += 2) {
              const row = (y - P + j) * g.w + (x - P);
              for (let k = 0; k < size; k += 2) sad += Math.abs(template[j * size + k] - frame[row + k]);
            }
            if (sad < best) {
              best = sad;
              bx = x;
              by = y;
            }
          }
        }
        const perPixel = best / (Math.ceil(size / 2) ** 2);
        if (perPixel > 38) lost = true;
        else {
          cx = bx;
          cy = by;
          readPatch(frame, cx, cy, template, 0.2);
        }
      }
      points.push([cx / g.w, cy / g.h]);
      onProgress(i / count);
      if (i % 3 === 0) await tick();
    }
    return { sourceId, t0: from, fps, points };
  } finally {
    g.dispose();
  }
}

/** Position of a track at a source time, or null before it starts. Holds the last point after it ends. */
export function trackAt(t: { t0: number; fps: number; points: [number, number][] }, sourceTime: number): [number, number] | null {
  const f = (sourceTime - t.t0) * t.fps;
  if (f < -0.5) return null;
  const last = t.points.length - 1;
  if (f >= last) return t.points[last];
  const i = Math.max(0, Math.floor(f));
  const a = t.points[i];
  const b = t.points[Math.min(i + 1, last)];
  const u = Math.max(0, f - i);
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}
