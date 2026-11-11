"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Crop, Download, Film, Layers, Music, Palette, Pause, Play, Redo2, Scissors, Sparkles, Type, Undo2, X, ZoomIn } from "lucide-react";
import { Container } from "@/components/ui/container";
import { trackPoint } from "@/lib/studio/analysis";
import { StudioEngine } from "@/lib/studio/engine";
import { formatTime } from "@/lib/studio/format";
import { emptyHistory, newId, reduceHistory, totalDuration } from "@/lib/studio/project";
import { initialProject, newClip, type QualityId, type Selection, type Source, type TextLayer } from "@/lib/studio/types";
import { AudioPanel } from "./panels-audio";
import { CanvasPanel, OverlayPanel, TextPanel } from "./panels-create";
import { EditPanel, LookPanel, MotionPanel, NoClip } from "./panels-edit";
import { Timeline } from "./timeline";
import { Empty, Note, type PanelProps, type TaskRunner } from "./ui";
import { useEngineValue } from "./use-engine-value";

type TabId = "edit" | "look" | "motion" | "audio" | "text" | "overlay" | "canvas" | "export";

const tabs: { id: TabId; label: string; icon: typeof Scissors }[] = [
  { id: "edit", label: "Edit", icon: Scissors },
  { id: "look", label: "Look", icon: Palette },
  { id: "motion", label: "Motion", icon: Sparkles },
  { id: "audio", label: "Audio", icon: Music },
  { id: "text", label: "Text", icon: Type },
  { id: "overlay", label: "Overlay", icon: Layers },
  { id: "canvas", label: "Canvas", icon: Crop },
  { id: "export", label: "Export", icon: Download },
];

type ExportState =
  | { status: "idle" }
  | { status: "working"; progress: number; mode: "video" | "audio" }
  | { status: "done"; url: string; extension: string; mode: "video" | "audio" }
  | { status: "error"; message: string };

function TimeReadout({ engine, total }: { engine: StudioEngine | null; total: number }) {
  const t = useEngineValue(engine, (e) => e.getTime(), 0);
  return (
    <p className="font-mono text-sm tabular-nums text-ink" aria-label="Playhead position">
      {formatTime(t)} <span className="text-ink-subtle">/ {formatTime(total)}</span>
    </p>
  );
}

const iconButton = "btn-glass !min-h-10 !min-w-10 !px-0 disabled:opacity-40";

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
  const [lastClipId, setLastClipId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("edit");
  const [quality, setQuality] = useState<QualityId>("720");
  const [zoom, setZoom] = useState(60);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [exportState, setExportState] = useState<ExportState>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const [task, setTask] = useState<{ label: string; progress: number | null } | null>(null);
  const [pickMode, setPickMode] = useState<{ kind: "text" | "layer"; id: string } | null>(null);
  const taskRunning = useRef(false);
  const cancelRef = useRef(false);
  const failedReverse = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const pickInput = useRef<HTMLInputElement>(null);
  const pickHandler = useRef<((file: File) => void) | null>(null);

  const playing = useEngineValue(engine, (e) => e.getPlaying(), false);
  const total = totalDuration(project.clips);
  const exporting = exportState.status === "working";
  const busy = exporting || task !== null;
  const hasClips = project.clips.length > 0;

  useEffect(() => {
    engine?.setProject(project);
  }, [engine, project]);

  useEffect(() => {
    engine?.setQuality(quality);
  }, [engine, quality]);

  // ---- helpers shared with the panels ----

  const run: TaskRunner = useCallback(async (label, job) => {
    if (taskRunning.current) return;
    taskRunning.current = true;
    cancelRef.current = false;
    setTask({ label, progress: null });
    try {
      await job(
        (progress) => setTask((t) => (t ? { ...t, progress } : t)),
        () => cancelRef.current,
        (next) => setTask((t) => (t ? { ...t, label: next } : t)),
      );
    } catch (error) {
      if (!cancelRef.current) setNotice(error instanceof Error ? error.message : "That did not work.");
    } finally {
      taskRunning.current = false;
      setTask(null);
    }
  }, []);

  const addMedia = useCallback(
    async (file: File): Promise<Source | null> => {
      if (!engine) return null;
      try {
        const source = await engine.addSource(file);
        setSources((prev) => [...prev, source]);
        return source;
      } catch (error) {
        setNotice(`${file.name}: ${error instanceof Error ? error.message : "could not be added"}`);
        return null;
      }
    },
    [engine],
  );

  const pick = useCallback((accept: string, onFile: (file: File) => void) => {
    pickHandler.current = onFile;
    if (pickInput.current) {
      pickInput.current.accept = accept;
      pickInput.current.click();
    }
  }, []);

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
      for (const file of videos) {
        const source = await addMedia(file);
        if (!source) continue;
        if (!engine.total) {
          const ratio = source.height > source.width * 1.1 ? "vertical" : source.width > source.height * 1.1 ? "wide" : "square";
          dispatch({ type: "setRatio", ratio });
        }
        const clip = newClip(newId("clip"), source.id, source.duration);
        dispatch({ type: "addClip", clip });
        setSelection((s) => s ?? { kind: "clip", id: clip.id });
        setLastClipId((id) => id ?? clip.id);
      }
      setLoading(false);
    },
    [engine, addMedia],
  );

  const select = useCallback((s: Selection) => {
    setSelection(s);
    if (!s) return;
    if (s.kind === "clip") {
      setLastClipId(s.id);
      setTab((t) => (["edit", "look", "motion", "audio"].includes(t) ? t : "edit"));
    } else setTab(s.kind === "text" ? "text" : s.kind === "layer" ? "overlay" : "audio");
  }, []);

  const split = useCallback(() => {
    if (engine) dispatch({ type: "split", t: engine.getTime() });
  }, [engine]);

  const addText = useCallback(() => {
    if (!engine) return;
    const start = Math.min(engine.getTime(), Math.max(total - 0.5, 0));
    const layer: TextLayer = {
      id: newId("text"),
      text: "Your text",
      start,
      end: Math.max(start + 3, start + 0.5),
      position: "bottom",
      size: "m",
      color: "white",
    };
    dispatch({ type: "addText", text: layer });
    select({ kind: "text", id: layer.id });
  }, [engine, total, select]);

  const removeSelected = useCallback(() => {
    if (!selection) return;
    const kinds = { clip: "deleteClip", text: "deleteText", layer: "deleteLayer", audio: "deleteAudio" } as const;
    dispatch({ type: kinds[selection.kind], id: selection.id });
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

  // Reversed clips need their frames prepared. This also covers undo and trimming.
  useEffect(() => {
    if (!engine || task) return;
    const clip = project.clips.find((c) => c.reverse && c.freeze === undefined && engine.needsReverse(c));
    if (!clip) return;
    const key = `${clip.id}:${clip.in}:${clip.out}`;
    if (failedReverse.current.has(key)) return;
    failedReverse.current.add(key);
    void run("Preparing reverse...", (progress) => engine.ensureReverse(clip, progress));
  }, [engine, project.clips, task, run]);

  async function runExport(mode: "video" | "audio") {
    if (!engine) return;
    if (exportState.status === "done") URL.revokeObjectURL(exportState.url);
    setTab("export");
    setExportState({ status: "working", progress: 0, mode });
    try {
      const { blob, extension } = await engine.exportVideo((progress) => setExportState({ status: "working", progress, mode }), mode);
      setExportState({ status: "done", url: URL.createObjectURL(blob), extension, mode });
    } catch (error) {
      setExportState({ status: "error", message: error instanceof Error ? error.message : "Export failed." });
    }
  }

  // ---- tracking: tap an object in the preview ----
  async function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!pickMode || !engine) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const spot = engine.frameSpot((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    const now = engine.mainNow();
    const target = pickMode;
    setPickMode(null);
    if (!spot || !now) return;
    const source = sources.find((s) => s.id === now.clip.sourceId);
    if (!source || spot.x < 0 || spot.x > 1 || spot.y < 0 || spot.y > 1) {
      setNotice("Tap on the video itself to pick an object.");
      return;
    }
    const end = Math.min(now.clip.out, now.sourceTime + 30);
    await run("Following the object...", async (progress, cancelled) => {
      const follow = await trackPoint(source.url, source.id, now.sourceTime, end, spot, progress, cancelled);
      if (target.kind === "text") dispatch({ type: "updateText", id: target.id, patch: { follow } });
      else dispatch({ type: "updateLayer", id: target.id, patch: { follow } });
    });
  }

  // ---- what the panels need ----
  const clipIndex = (() => {
    const id = selection?.kind === "clip" ? selection.id : lastClipId;
    const i = project.clips.findIndex((c) => c.id === id);
    return i >= 0 ? i : project.clips.length ? 0 : -1;
  })();
  const clip = clipIndex >= 0 ? project.clips[clipIndex] : null;
  const textLayer = selection?.kind === "text" ? project.texts.find((t) => t.id === selection.id) : undefined;
  const overlayLayer = selection?.kind === "layer" ? project.layers.find((l) => l.id === selection.id) : undefined;

  const panelProps: PanelProps = useMemo(
    () => ({ project, dispatch, engine, sources, selection, setSelection: select, total, notify: setNotice, run, pick, addMedia, busy }),
    [project, engine, sources, selection, select, total, run, pick, addMedia, busy],
  );

  const tabBar = (className: string) => (
    <nav aria-label="Studio tools" className={className}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            onClick={() => setTab(t.id)}
            className={`flex min-h-12 min-w-[4.2rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-medium transition-colors ${
              active ? "bg-accent/15 text-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </nav>
  );

  function renderPanel() {
    if (!hasClips && tab !== "canvas") {
      return <Empty>Add a video to start editing. Everything stays on your device.</Empty>;
    }
    switch (tab) {
      case "edit":
        return clip ? <EditPanel {...panelProps} clip={clip} index={clipIndex} /> : <NoClip />;
      case "look":
        return clip ? <LookPanel {...panelProps} clip={clip} index={clipIndex} /> : <NoClip />;
      case "motion":
        return clip ? <MotionPanel {...panelProps} clip={clip} index={clipIndex} /> : <NoClip />;
      case "audio":
        return <AudioPanel {...panelProps} clip={clip} onExportAudio={() => runExport("audio")} />;
      case "text":
        return <TextPanel {...panelProps} layer={textLayer} onAddText={addText} onTrack={setPickMode} />;
      case "overlay":
        return <OverlayPanel {...panelProps} layer={overlayLayer} onTrack={setPickMode} />;
      case "canvas":
        return <CanvasPanel {...panelProps} quality={quality} onQuality={setQuality} />;
      case "export":
        return (
          <div className="space-y-4">
            <button type="button" onClick={() => runExport("video")} disabled={!hasClips || busy} className="btn-gold w-full justify-center disabled:opacity-60">
              <Download size={18} aria-hidden="true" />
              {exporting ? "Exporting..." : "Export video"}
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
              <a href={exportState.url} download={`great-val-${exportState.mode}.${exportState.extension}`} className="btn-glass w-full justify-center">
                Save your .{exportState.extension} file
              </a>
            ) : null}
            {exportState.status === "error" ? (
              <p role="alert" className="text-sm text-red-300">
                {exportState.message}
              </p>
            ) : null}
            <Note>
              Export plays your video in real time, so a one-minute video takes about a minute. Keep this tab open and in front while it runs. Everything
              stays on your device.
            </Note>
          </div>
        );
    }
  }

  return (
    <section aria-labelledby="studio-title" className="py-6 sm:py-10">
      <Container>
        <h1 id="studio-title" className="text-3xl font-bold sm:text-4xl">
          Video Studio
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">
          Edit short videos for Reels, TikTok and YouTube. Everything happens on your device, and your videos are never uploaded.
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
        <input
          ref={pickInput}
          type="file"
          className="sr-only"
          aria-label="Choose a file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickHandler.current?.(file);
            e.target.value = "";
          }}
        />

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start">
          <div className="sticky top-16 z-30 -mx-4 min-w-0 space-y-3 bg-canvas/95 px-4 pb-3 pt-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="contents">
              <div
                className={`relative flex min-h-[12rem] items-center justify-center rounded-2xl border bg-black/30 p-2 transition-colors sm:min-h-[18rem] ${dragging ? "border-accent" : "border-white/10"}`}
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
                  onClick={onCanvasClick}
                  className={`max-h-[30vh] max-w-full rounded-lg object-contain sm:max-h-[56vh] ${pickMode ? "cursor-crosshair ring-2 ring-accent" : ""}`}
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
                {pickMode ? (
                  <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-xl border border-accent/50 bg-canvas/90 px-3 py-2 text-sm text-ink">
                    <span>Tap the object to follow.</span>
                    <button type="button" aria-label="Cancel tracking" onClick={() => setPickMode(null)} className="grid size-7 place-items-center rounded-full hover:bg-white/10">
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={togglePlay} disabled={!hasClips || busy} aria-label={playing ? "Pause" : "Play"} className="btn-gold !min-h-10 !min-w-12 !px-4 disabled:opacity-50">
                  {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                </button>
                <TimeReadout engine={engine} total={total} />
                <div className="ml-auto flex items-center gap-2">
                  <button type="button" onClick={() => fileInput.current?.click()} disabled={loading || !engine || busy} aria-label="Add video" className={iconButton}>
                    <Film size={16} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={split} disabled={!hasClips || busy} aria-label="Split at the playhead" className={iconButton}>
                    <Scissors size={16} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => dispatch({ type: "undo" })} disabled={!history.past.length || busy} aria-label="Undo" className={iconButton}>
                    <Undo2 size={16} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => dispatch({ type: "redo" })} disabled={!history.future.length || busy} aria-label="Redo" className={iconButton}>
                    <Redo2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
            {notice ? (
              <p role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                <span>{notice}</span>
                <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")} className="shrink-0 opacity-70 hover:opacity-100">
                  <X size={15} aria-hidden="true" />
                </button>
              </p>
            ) : null}

            {task ? (
              <div role="status" className="rounded-xl border border-accent/40 bg-accent/10 p-3">
                <div className="flex items-center justify-between gap-3 text-sm text-ink">
                  <span>{task.label}</span>
                  <button type="button" onClick={() => (cancelRef.current = true)} className="text-xs text-ink-muted underline underline-offset-4 hover:text-ink">
                    Cancel
                  </button>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full bg-accent ${task.progress === null ? "w-1/3 animate-pulse" : "transition-[width]"}`} style={task.progress === null ? undefined : { width: `${task.progress * 100}%` }} />
                </div>
              </div>
            ) : null}

            <Timeline engine={engine} project={project} sources={sources} selection={selection} onSelect={select} dispatch={dispatch} pxPerSec={zoom} />

            <label className="flex items-center gap-3 text-xs text-ink-subtle">
              <ZoomIn size={14} aria-hidden="true" />
              <span className="sr-only">Timeline zoom</span>
              <input type="range" min={20} max={160} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="studio-range w-40" />
              <span className="hidden sm:inline">Space plays, S splits, Delete removes, Ctrl+Z undoes. Drag bars sideways to move them.</span>
            </label>
          </div>

          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
            <div className="hidden lg:block">{tabBar("grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5")}</div>
            <div className="h-3 hidden lg:block" />
            <div className="card !p-4 sm:!p-5">{renderPanel()}</div>
          </div>

          <div className="sticky bottom-3 z-40 min-w-0 lg:hidden">
            {tabBar("flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-canvas/95 p-1.5 shadow-xl shadow-black/50 backdrop-blur")}
          </div>
        </div>
      </Container>
    </section>
  );
}
