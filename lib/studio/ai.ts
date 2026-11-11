import type { CaptionWord } from "./types";

/**
 * In-browser AI helpers. They are loaded only when the visitor asks for them, from a public
 * CDN, so the editor itself stays small. Models run on the visitor's device and nothing is uploaded.
 */

const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/+esm";
const MEDIAPIPE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2";
const SEGMENTER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const WHISPER_MODEL = "Xenova/whisper-tiny.en";

/** Loads a module from a URL at run time, skipping the bundler. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadModule(url: string): Promise<any> {
  try {
    return await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);
  } catch {
    throw new Error("The AI model could not be loaded. Check your connection and try again.");
  }
}

// ---- captions ----

export const CAPTION_DOWNLOAD_NOTE = "First use downloads a speech model of about 40 MB. It is kept by your browser for next time.";

type AsrChunk = { text: string; timestamp: [number, number | null] };

export async function transcribe(samples: Float32Array, onStatus: (message: string) => void): Promise<CaptionWord[]> {
  try {
    return await transcribeUnsafe(samples, onStatus);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The AI model")) throw error;
    throw new Error("Captions could not be made on this device. Try again on a stronger connection, or in Chrome.");
  }
}

async function transcribeUnsafe(samples: Float32Array, onStatus: (message: string) => void): Promise<CaptionWord[]> {
  onStatus("Loading the speech model...");
  const lib = await loadModule(TRANSFORMERS);
  const asr = await lib.pipeline("automatic-speech-recognition", WHISPER_MODEL, {
    dtype: "q8",
    progress_callback: (p: { status?: string; progress?: number }) => {
      if (p.status === "progress" && typeof p.progress === "number") onStatus(`Downloading the speech model... ${Math.round(p.progress)}%`);
    },
  });
  onStatus("Listening to your video...");
  const out = (await asr(samples, { return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5 })) as { chunks?: AsrChunk[] };
  const words: CaptionWord[] = [];
  for (const c of out.chunks ?? []) {
    const text = c.text.trim();
    if (!text) continue;
    const start = c.timestamp[0];
    const end = c.timestamp[1] ?? start + 0.4;
    words.push({ text, start, end });
  }
  return words;
}

// ---- background removal ----

export interface Segmenter {
  /** Returns the frame with the background cut out, or null when it is not ready. */
  cutout: (video: HTMLVideoElement) => HTMLCanvasElement | null;
  close: () => void;
}

export async function loadSegmenter(onStatus: (message: string) => void): Promise<Segmenter> {
  try {
    return await loadSegmenterUnsafe(onStatus);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The AI model")) throw error;
    throw new Error("Background removal could not start on this device. Try again on a stronger connection, or in Chrome.");
  }
}

async function loadSegmenterUnsafe(onStatus: (message: string) => void): Promise<Segmenter> {
  onStatus("Loading the background remover...");
  const mp = await loadModule(`${MEDIAPIPE}/vision_bundle.mjs`);
  const files = await mp.FilesetResolver.forVisionTasks(`${MEDIAPIPE}/wasm`);
  const create = (delegate: "GPU" | "CPU") =>
    mp.ImageSegmenter.createFromOptions(files, {
      baseOptions: { modelAssetPath: SEGMENTER_MODEL, delegate },
      runningMode: "VIDEO",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let segmenter: any;
  try {
    segmenter = await create("GPU");
  } catch {
    segmenter = await create("CPU");
  }

  const out = document.createElement("canvas");
  const maskCanvas = document.createElement("canvas");
  let stamp = 1;
  return {
    cutout(video) {
      if (video.readyState < 2 || !video.videoWidth) return null;
      const result = segmenter.segmentForVideo(video, (stamp += 33));
      const mask = result.categoryMask;
      if (!mask) return null;
      const values: Uint8Array = mask.getAsUint8Array();
      const mw: number = mask.width;
      const mh: number = mask.height;
      maskCanvas.width = mw;
      maskCanvas.height = mh;
      const mctx = maskCanvas.getContext("2d");
      if (!mctx) return null;
      const image = mctx.createImageData(mw, mh);
      for (let i = 0; i < values.length; i++) {
        const o = i * 4;
        image.data[o] = image.data[o + 1] = image.data[o + 2] = 255;
        image.data[o + 3] = values[i] ? 255 : 0;
      }
      mctx.putImageData(image, 0, 0);
      const k = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
      out.width = Math.round(video.videoWidth * k);
      out.height = Math.round(video.videoHeight * k);
      const octx = out.getContext("2d");
      if (!octx) return null;
      octx.globalCompositeOperation = "source-over";
      octx.clearRect(0, 0, out.width, out.height);
      octx.drawImage(video, 0, 0, out.width, out.height);
      octx.globalCompositeOperation = "destination-in";
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = "high";
      octx.drawImage(maskCanvas, 0, 0, out.width, out.height);
      octx.globalCompositeOperation = "source-over";
      mask.close?.();
      return out;
    },
    close: () => segmenter.close?.(),
  };
}
