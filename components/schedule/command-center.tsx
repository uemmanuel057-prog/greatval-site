"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Chip, Field, inputClass } from "@/components/graphics-generator/controls";
import {
  platformById,
  platforms,
  type MediaItem,
  type PlatformId,
  type ScheduledPost,
} from "@/lib/schedule/platforms";
import { MediaPicker } from "./media-picker";
import { PostList } from "./post-list";

interface Overview {
  setup: { database: boolean; buffer: boolean };
  connected: PlatformId[];
  posts: ScheduledPost[];
  notice: string;
}

const emptyOverview: Overview = { setup: { database: true, buffer: true }, connected: [], posts: [], notice: "" };

/** "Tomorrow, 09:00" in Lagos time, formatted for a datetime-local field. */
function tomorrowMorning(): string {
  const lagosNow = new Date(Date.now() + 60 * 60 * 1000); // Lagos is UTC+1 all year
  lagosNow.setUTCDate(lagosNow.getUTCDate() + 1);
  return `${lagosNow.toISOString().slice(0, 10)}T09:00`;
}

export function CommandCenter() {
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [loaded, setLoaded] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [text, setText] = useState("");
  const [selected, setSelected] = useState<PlatformId[]>([]);
  const [overrides, setOverrides] = useState<Partial<Record<PlatformId, string>>>({});
  const [customising, setCustomising] = useState<PlatformId | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/schedule", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Overview>) : null))
      .then((data) => {
        if (cancelled) return;
        if (data) setOverview(data);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    fetch("/api/admin/schedule/media", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ items: MediaItem[] }>) : null))
      .then((data) => {
        if (!cancelled && data) setMedia(data.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const connected = overview.connected;

  function togglePlatform(id: PlatformId) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    if (customising === id) setCustomising(null);
  }

  function textFor(id: PlatformId) {
    return (overrides[id] ?? "").trim() || text.trim();
  }

  async function submit() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, platforms: selected, overrides, mediaUrls: images, scheduledLocal: when }),
    }).catch(() => null);
    const data = res
      ? ((await res.json().catch(() => ({}))) as { error?: string; problems?: string[] })
      : { error: "Could not reach the server." };
    if (res?.ok) {
      const partial = data.problems?.length ? ` Some platforms had problems: ${data.problems.join("; ")}` : "";
      setMessage({ kind: partial ? "error" : "ok", text: `Scheduled.${partial}` });
      setText("");
      setOverrides({});
      setCustomising(null);
      setImages([]);
    } else {
      setMessage({ kind: "error", text: data.error ?? (data.problems ?? []).join("; ") ?? "Something went wrong." });
    }
    setBusy(false);
    setReloadKey((k) => k + 1);
  }

  async function removeFromLog(id: string) {
    await fetch(`/api/admin/schedule?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    setReloadKey((k) => k + 1);
  }

  const over = selected.some((id) => textFor(id).length > platformById[id].limit);
  const needsImage = selected.some((id) => platformById[id].needsImage) && !images.length;
  const ready = Boolean(text.trim()) && selected.length > 0 && Boolean(when) && !over && !needsImage;

  return (
    <section aria-labelledby="schedule-title" className="py-10 sm:py-14">
      <Container>
        <h1 id="schedule-title" className="text-3xl font-bold sm:text-4xl">
          Social Media Command Center
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Write once, pick the platforms, attach an image and choose a time in Lagos time. Buffer publishes it.
        </p>

        {loaded && (!overview.setup.database || !overview.setup.buffer || overview.notice) ? (
          <div role="status" className="card mt-6 space-y-1 !p-5 text-sm">
            {!overview.setup.database ? (
              <p className="text-ink-muted">
                Database not connected. Add <code className="font-mono text-accent">SUPABASE_URL</code> and{" "}
                <code className="font-mono text-accent">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel, then redeploy.
              </p>
            ) : null}
            {!overview.setup.buffer ? (
              <p className="text-ink-muted">
                Buffer not connected. Add <code className="font-mono text-accent">BUFFER_ACCESS_TOKEN</code> in Vercel, then redeploy.
              </p>
            ) : null}
            {overview.notice ? <p className="text-red-300">{overview.notice}</p> : null}
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
          <div className="space-y-8">
            <div className="card space-y-6">
              <Field label="Post" htmlFor="post-text" hint={`${text.length} characters`}>
                <textarea
                  id="post-text"
                  rows={7}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What do you want to say?"
                  className={inputClass}
                />
              </Field>

              <Field label="Platforms">
                <div className="flex flex-wrap gap-2">
                  {platforms.map((p) => {
                    const isConnected = connected.includes(p.id);
                    return isConnected ? (
                      <Chip key={p.id} active={selected.includes(p.id)} onClick={() => togglePlatform(p.id)}>
                        {p.label}
                      </Chip>
                    ) : (
                      <span
                        key={p.id}
                        className="rounded-full border border-dashed border-white/10 px-3.5 py-1.5 text-sm text-ink-subtle"
                      >
                        {p.label} (not connected)
                      </span>
                    );
                  })}
                </div>
                {loaded && connected.length === 0 ? (
                  <p className="mt-2 text-xs text-ink-subtle">
                    Connect your channels in Buffer and they appear here. X is optional and needs a paid Buffer channel.
                  </p>
                ) : null}
              </Field>

              {selected.length ? (
                <ul className="space-y-3" aria-label="Character counts">
                  {selected.map((id) => {
                    const info = platformById[id];
                    const len = textFor(id).length;
                    const bad = len > info.limit;
                    return (
                      <li key={id}>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="w-24 text-sm text-ink-muted">{info.label}</span>
                          <span className={`font-mono text-sm ${bad ? "text-red-300" : "text-ink"}`}>
                            {len}/{info.limit}
                          </span>
                          {bad ? <span className="text-xs text-red-300">Too long</span> : null}
                          {info.needsImage ? <span className="text-xs text-ink-subtle">Needs an image</span> : null}
                          <button
                            type="button"
                            onClick={() => setCustomising(customising === id ? null : id)}
                            className="ml-auto text-xs text-accent underline-offset-4 hover:underline"
                          >
                            {customising === id ? "Hide custom text" : `Custom text for ${info.label}`}
                          </button>
                        </div>
                        {customising === id ? (
                          <textarea
                            aria-label={`Custom text for ${info.label}`}
                            rows={4}
                            value={overrides[id] ?? ""}
                            onChange={(e) => setOverrides((prev) => ({ ...prev, [id]: e.target.value }))}
                            placeholder={`Leave empty to use the main text on ${info.label}.`}
                            className={`${inputClass} mt-2`}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            <div className="card space-y-4">
              <Field label="Images">
                <MediaPicker
                  items={media}
                  selected={images}
                  disabled={!overview.setup.database}
                  onToggle={(url) =>
                    setImages((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]))
                  }
                  onUploaded={(item) => {
                    setMedia((prev) => [item, ...prev]);
                    setImages((prev) => (prev.length < 4 ? [...prev, item.url] : prev));
                  }}
                />
              </Field>
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="card space-y-5">
              <Field label="Publish at (Lagos time)" htmlFor="when">
                <input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputClass} />
                <div className="mt-3">
                  <Chip onClick={() => setWhen(tomorrowMorning())}>Tomorrow 09:00</Chip>
                </div>
              </Field>
              <button type="button" onClick={submit} disabled={!ready || busy} className="btn-gold w-full justify-center disabled:opacity-60">
                <CalendarClock size={18} aria-hidden="true" />
                {busy ? "Scheduling..." : "Schedule post"}
              </button>
              {!ready && (text || selected.length) ? (
                <p className="text-xs text-ink-subtle">
                  {!text.trim()
                    ? "Write your post."
                    : !selected.length
                      ? "Pick a platform."
                      : over
                        ? "A platform's character limit is exceeded."
                        : needsImage
                          ? "Instagram needs an image."
                          : "Pick a date and time."}
                </p>
              ) : null}
              {message ? (
                <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-red-300" : "text-emerald-300"}`}>
                  {message.text}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <h2 className="mt-14 text-2xl font-bold">Posts</h2>
        <div className="mt-4">
          <PostList posts={overview.posts} onRemove={removeFromLog} />
        </div>
      </Container>
    </section>
  );
}
