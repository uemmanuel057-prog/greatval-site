"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import type { MediaItem } from "@/lib/schedule/platforms";

const MAX_IMAGES = 4;

/** Image library for posts: pick up to four, or upload a new one. */
export function MediaPicker({
  items,
  selected,
  onToggle,
  onUploaded,
  disabled,
}: {
  items: MediaItem[];
  selected: string[];
  onToggle: (url: string) => void;
  onUploaded: (item: MediaItem) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/schedule/media", { method: "POST", body: form }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { item?: MediaItem; error?: string }) : {};
    if (res?.ok && data.item) onUploaded(data.item);
    else setError(data.error ?? "Upload failed.");
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy || disabled}
          className="btn-glass disabled:opacity-60"
        >
          <ImagePlus size={18} aria-hidden="true" />
          {busy ? "Uploading..." : "Upload image"}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Upload an image"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <p className="text-xs text-ink-subtle">
          PNG, JPG or WebP, up to 10 MB. Made a graphic? Download it in the Graphics Generator, then upload it here.
        </p>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {items.length ? (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4" aria-label="Image library">
          {items.map((item) => {
            const on = selected.includes(item.url);
            const full = !on && selected.length >= MAX_IMAGES;
            return (
              <li key={item.url}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`${on ? "Remove" : "Attach"} ${item.name}`}
                  disabled={full}
                  onClick={() => onToggle(item.url)}
                  className={`relative block aspect-square w-full overflow-hidden rounded-xl border-2 transition-colors disabled:opacity-40 ${
                    on ? "border-accent" : "border-white/10 hover:border-accent/50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- small external thumbnails from our own bucket */}
                  <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {on ? (
                    <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-accent text-canvas">
                      <Check size={14} aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-subtle">No images yet. Upload one to attach it to a post.</p>
      )}
      <p className="mt-2 font-mono text-xs text-ink-subtle">
        {selected.length}/{MAX_IMAGES} attached
      </p>
    </div>
  );
}
