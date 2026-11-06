import "server-only";
import type { MediaItem, ScheduledPost } from "./platforms";

/**
 * Minimal server-only Supabase client using plain fetch, so no extra packages.
 * Credentials come from environment variables and never reach the browser.
 */

const BUCKET = "gv-graphics";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function supabaseConfigured(): boolean {
  return config() !== null;
}

async function call(path: string, init: RequestInit & { json?: unknown } = {}): Promise<Response> {
  const c = config();
  if (!c) throw new Error("Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  const { json, headers, ...rest } = init;
  return fetch(`${c.url}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
}

async function fail(res: Response, what: string): Promise<never> {
  const text = await res.text().catch(() => "");
  console.error(`Supabase ${what} failed`, res.status, text.slice(0, 300));
  throw new Error(`${what} failed (${res.status}).`);
}

export async function listPosts(limit = 50): Promise<ScheduledPost[]> {
  const res = await call(`/rest/v1/gv_posts?select=*&order=scheduled_at.desc&limit=${limit}`);
  if (!res.ok) return fail(res, "Loading posts");
  return (await res.json()) as ScheduledPost[];
}

export async function insertPost(row: Omit<ScheduledPost, "id" | "created_at">): Promise<ScheduledPost> {
  const res = await call("/rest/v1/gv_posts", {
    method: "POST",
    json: row,
    headers: { Prefer: "return=representation" },
  });
  if (!res.ok) return fail(res, "Saving the post");
  const rows = (await res.json()) as ScheduledPost[];
  return rows[0];
}

export async function deletePost(id: string): Promise<void> {
  const res = await call(`/rest/v1/gv_posts?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return fail(res, "Deleting the post");
}

export async function listMedia(): Promise<MediaItem[]> {
  const res = await call(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    json: { prefix: "", limit: 60, sortBy: { column: "created_at", order: "desc" } },
  });
  if (!res.ok) return fail(res, "Loading images");
  const items = (await res.json()) as { name: string; id: string | null }[];
  const base = config()!.url;
  return items
    .filter((i) => i.id)
    .map((i) => ({ name: i.name, url: `${base}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(i.name)}` }));
}

const extByType: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function uploadMedia(file: File): Promise<MediaItem> {
  const ext = extByType[file.type];
  if (!ext) throw new Error("Only PNG, JPG or WebP images are allowed.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller.");
  const stem = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const name = `${Date.now()}-${stem || "graphic"}.${ext}`;
  const res = await call(`/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`, {
    method: "POST",
    body: await file.arrayBuffer(),
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) return fail(res, "Uploading the image");
  return { name, url: `${config()!.url}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(name)}` };
}

/** Only images from our own bucket may be attached to a post. */
export function isOwnMediaUrl(url: string): boolean {
  const c = config();
  return Boolean(c && url.startsWith(`${c.url}/storage/v1/object/public/${BUCKET}/`));
}
