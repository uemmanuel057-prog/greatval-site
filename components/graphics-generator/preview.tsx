"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { GraphicRatio } from "@/lib/graphics/brand";

/** Live preview: the exact PNG the download button produces, at standard size. */
export function GraphicPreview({ query, ratio }: { query: string; ratio: GraphicRatio }) {
  const [src, setSrc] = useState("");
  const [loaded, setLoaded] = useState("");
  const [failed, setFailed] = useState("");

  // Wait for a pause in typing before asking the server for a new image.
  useEffect(() => {
    const timer = setTimeout(() => setSrc(`/api/admin/graphics?${query}`), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const rendering = src === "" || (src !== loaded && src !== failed);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-raised"
      style={{ aspectRatio: ratio === "wide" ? "16 / 9" : "1 / 1" }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a generated, private image; next/image does not apply
        <img
          src={src}
          alt="Preview of the generated graphic"
          onLoad={() => setLoaded(src)}
          onError={() => setFailed(src)}
          className="h-full w-full object-contain"
        />
      ) : null}
      {rendering ? (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas/60 text-ink-muted">
          <Loader2 size={28} className="animate-spin" aria-label="Rendering preview" />
        </div>
      ) : null}
      {failed === src && src !== "" ? (
        <div role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-300">
          Preview failed. Your session may have expired, so reload the page and log in again.
        </div>
      ) : null}
    </div>
  );
}
