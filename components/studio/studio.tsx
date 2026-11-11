"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Download, Film, Pause, Play, Redo2, Scissors, Trash2, Type, Undo2, ZoomIn } from "lucide-react";
import { Container } from "@/components/ui/container";
import { StudioEngine } from "@/lib/studio/engine";
import { formatTime } from "@/lib/studio/format";
import { emptyHistory, layout, newId, reduceHistory, totalDuration } from "@/lib/studio/project";
import { initialProject, type QualityId, type Selection, type Source } from "@/lib/studio/types";
import { ClipPanel, ProjectPanel, TextPanel } from "./inspector";
import { Timeline } from "./timeline";
import { useEngineValue } from "./use-engine-value";

type ExportState =
  | { status: "idle" }
  | { status: "working"; progress: number }
  | { status: "done"; url: string; extension: string }
  | { status: "error"; message: string };

function TimeReadout({ engine, total }: { engine: StudioEngine | null; total: number }) {
  const t = useEngineValue(engine, (e) => e.getTime(), 0);
  return (
    <p className="font-mono text-sm tabular-nums text-ink" aria-label="Playhead position">
      {formatTime(t)} <span className="text-ink-subtle">/ {formatTime(total)}</span>
    </p>
  );
}

export function Studio() {
  const [engine, setEngine] = useState<StudioEngine | null>(null);
  const engineRef = useRef<StudioEngine | null>(null);
  const canvasRef = useCallback((el: HTMLCanvasElement | null) => {
    if (el) {
      const created = new StudioEngine(el);
      engineRef.current = created;
      setEngine(created);
    } else {
      engineRef.current?.dispose();
      engineRef.current = null;
      setEngine(null);
    }
  }, []);

  const [history, dispatch] = useReducer(reduceHistory, initialProject, emptyHistory);
  const project = history.present;
  const [sources, setSources] = useState<Source[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [quality, setQuality] = useState<QualityId>("720");
  const [zoom, setZoom] = useState(60);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [exportState, setExportState] = useState<ExportState>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const playing = useEngineValue(engine, (e) => e.getPlaying(), false);
  const total = totalDuration(project.clips);
  const busy = exportState.status === "working";

  useEffect(() => {
    engine?.setProject(project);
  }, [engine, project]);

  useEffect(() => {
    engine?.setQuality(quality);
  }, [engine, quality]);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!engine) return;
      const videos = Array.from(files).filter((f) => f.type.startsWith("video/"));
      if (!videos.length) {
        setNotice("Choose a video file, such as MP4 or MOV.");
        return;
      }
      setLoading(true);
      setNotice("");
      const problems: string[] = [];
      for (const file of videos) {
        try {
          const source = await engine.addSource(file);
          setSources((prev) => [...prev, source]);
          if (!engine.total) {
            const ratio = source.height > source.width * 1.1 ? "vertical" : source.width > source.height * 1.1 ? "wide" : "square";
            dispatch({ type: "setRatio", ratio });
          }
          const clip = { id: newId("clip"), sourceId: source.id, in: 0, out: source.duration, speed: 1, volume: 1 };
          dispatch({ type: "addClip", clip });
          setSelection((s) => s ?? { kind: "clip", id: clip.id });
        } catch (error) {
          problems.push(`${file.name}: ${error instanceof Error ? error.message : "could not be added"}`);
        }
      }
      if (problems.length) setNotice(problems.join(" "));
      setLoading(false);
    },
    [engine],
  );

  const split = useCallback(() => {
    if (engine) dispatch({ type: "split", t: engine.getTime() });
  }, [engine]);

  const addText = useCallback(() => {
    if (!engine) return;
    const start = Math.min(engine.getTime(), Math.max(total - 0.5, 0));
    const layer = {
      id: newId("text"),
      text: "Your text",
      start,
      end: Math.max(start + 3, start + 0.5),
      position: "bottom" as const,
      size: "m" as const,
      color: "white" as const,
    };
    dispatch({ type: "addText", text: layer });
    setSelection({ kind: "text", id: layer.id });
  }, [engine, total]);

  const removeSelected = useCallback(() => {
    if (!selection) return;
    dispatch(selection.kind === "clip" ? { type: "deleteClip", id: selection.id } : { type: "deleteText", id: selection.id });
    setSelection(null);
  }, [selection]);

  const togglePlay = useCallback(() => {
    if (!engine) return;
    if (engine.getPlaying()) engine.pause();
    else engine.play();
  }, [engine]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.altKey) return;
      if (e.ctrlKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          dispatch({ type: e.shiftKey ? "redo" : "undo" });
        }
        return;
      }
      if (e.key === " " && !target.closest("button")) {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "s") split();
      else if (e.key === "Delete" || e.key === "Backspace") removeSelected();
      else if (e.key === "ArrowLeft") engine?.seek(engine.getTime() - 0.1);
      else if (e.key === "ArrowRight") engine?.seek(engine.getTime() + 0.1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, togglePlay, split, removeSelected]);

  async function runExport() {
    if (!engine) return;
    if (exportState.status === "done") URL.revokeObjectURL(exportState.url);
    setExportState({ status: "working", progress: 0 });
    try {
      const { blob, extension } = await engine.exportVideo((progress) => setExportState({ status: "working", progress }));
      const url = URL.createObjectURL(blob);
      setExportState({ status: "done", url, extension });
    } catch (error) {
      setExportState({ status: "error", message: error instanceof Error ? error.message : "Export failed." });
    }
  }

  const selectedClip = selection?.kind === "clip" ? layout(project.clips).findIndex((i) => i.clip.id === selection.id) : -1;
  const clip = selectedClip >= 0 ? project.clips[selectedClip] : null;
  const textLayer = selection?.kind === "text" ? project.texts.find((t) => t.id === selection.id) : undefined;
  const hasClips = project.clips.length > 0;

  return (
    <section aria-labelledby="studio-title" className="py-8 sm:py-12">
      <Container>
        <h1 id="studio-title" className="text-3xl font-bold sm:text-4xl">
          Video Studio
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Trim, split, add text and export short videos for Reels, TikTok and YouTube. Everything happens on your device.
          Your videos are never uploaded.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          multiple
          className="sr-only"
          aria-label="Add video files"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0 space-y-4">
            <div
              className={`relative flex min-h-[18rem] items-center justify-center rounded-2xl border bg-black/30 p-3 transition-colors ${
                dragging ? "border-accent" : "border-white/10"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void addFiles(e.dataTransfer.files);
              }}
            >
              <canvas
                ref={canvasRef}
                aria-label="Video preview"
                className="max-h-[62vh] max-w-full rounded-lg object-contain"
                style={{ height: "auto", width: "auto" }}
              />
              {!hasClips ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <button type="button" onClick={() => fileInput.current?.click()} disabled={loading || !engine} className="btn-gold disabled:opacity-60">
                    <Film size={18} aria-hidden="true" />
                    {loading ? "Loading..." : "Add a video"}
                  </button>
                  <p className="text-sm text-ink-muted">or drop a video file here</p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={togglePlay} disabled={!hasClips || busy} aria-label={playing ? "Pause" : "Play"} className="btn-gold !min-h-11 !px-5 disabled:opacity-50">
                {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              </button>
              <TimeReadout engine={engine} total={total} />
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => fileInput.current?.click()} disabled={loading || !engine || busy} className="btn-glass !min-h-11 !px-4 disabled:opacity-60">
                  <Film size={16} aria-hidden="true" /> {loading ? "Loading..." : "Add video"}
                </button>
                <button type="button" onClick={addText} disabled={!hasClips || busy} className="btn-glass !min-h-11 !px-4 disabled:opacity-50">
                  <Type size={16} aria-hidden="true" /> Text
                </button>
                <button type="button" onClick={split} disabled={!hasClips || busy} className="btn-glass !min-h-11 !px-4 disabled:opacity-50">
                  <Scissors size={16} aria-hidden="true" /> Split
                </button>
                <button type="button" onClick={removeSelected} disabled={!selection || busy} aria-label="Delete selected" className="btn-glass !min-h-11 !px-3 disabled:opacity-50">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => dispatch({ type: "undo" })} disabled={!history.past.length || busy} aria-label="Undo" className="btn-glass !min-h-11 !px-3 disabled:opacity-50">
                  <Undo2 size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => dispatch({ type: "redo" })} disabled={!history.future.length || busy} aria-label="Redo" className="btn-glass !min-h-11 !px-3 disabled:opacity-50">
                  <Redo2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            {notice ? (
              <p role="alert" className="text-sm text-red-300">
                {notice}
              </p>
            ) : null}

            <Timeline engine={engine} project={project} sources={sources} selection={selection} onSelect={setSelection} pxPerSec={zoom} />

            <label className="flex items-center gap-3 text-xs text-ink-subtle">
              <ZoomIn size={14} aria-hidden="true" />
              <span className="sr-only">Timeline zoom</span>
              <input type="range" min={20} max={160} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-40 accent-[#E5A93C]" />
              <span className="hidden sm:inline">Space plays, S splits, Delete removes, Ctrl+Z undoes.</span>
            </label>
          </div>

          <div className="space-y-4">
            {clip ? (
              <ClipPanel
                clip={clip}
                source={sources.find((s) => s.id === clip.sourceId)}
                index={selectedClip}
                count={project.clips.length}
                dispatch={dispatch}
                onSplit={split}
              />
            ) : null}
            {textLayer ? <TextPanel layer={textLayer} total={total} dispatch={dispatch} /> : null}
            <ProjectPanel project={project} quality={quality} onQuality={setQuality} dispatch={dispatch} />

            <div className="card space-y-4 !p-5">
              <p className="eyebrow">Export</p>
              <button type="button" onClick={runExport} disabled={!hasClips || busy} className="btn-gold w-full justify-center disabled:opacity-60">
                <Download size={18} aria-hidden="true" />
                {busy ? "Exporting..." : "Export video"}
              </button>
              {exportState.status === "working" ? (
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Export progress" aria-valuenow={Math.round(exportState.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${exportState.progress * 100}%` }} />
                  </div>
                  <button type="button" onClick={() => engine?.cancelExport()} className="mt-3 text-xs text-ink-subtle underline underline-offset-4 hover:text-ink">
                    Cancel
                  </button>
                </div>
              ) : null}
              {exportState.status === "done" ? (
                <a href={exportState.url} download={`great-val-video.${exportState.extension}`} className="btn-glass w-full justify-center">
                  Save your .{exportState.extension} file
                </a>
              ) : null}
              {exportState.status === "error" ? (
                <p role="alert" className="text-sm text-red-300">
                  {exportState.message}
                </p>
              ) : null}
              <p className="text-xs text-ink-subtle">
                Export plays your video in real time, so a one-minute video takes about a minute. Keep this tab open and in
                front while it runs.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
