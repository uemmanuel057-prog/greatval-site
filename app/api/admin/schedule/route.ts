import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { bufferConfigured, channelFor, connectedPlatforms, listChannels, schedulePost, type BufferChannel } from "@/lib/schedule/buffer";
import { platformById, platformIds, lagosToIso, type PlatformId, type PostStatus } from "@/lib/schedule/platforms";
import { deletePost, insertPost, isOwnMediaUrl, listPosts, supabaseConfigured } from "@/lib/schedule/supabase";

const MAX_IMAGES = 4;
const MIN_LEAD_MS = 2 * 60 * 1000;
const MAX_LEAD_MS = 365 * 24 * 60 * 60 * 1000;

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function authorised(request: NextRequest) {
  // The proxy already gates this route. Checking again keeps it safe even if the proxy config changes.
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

/** Posts, plus which platforms are connected in Buffer. */
export async function GET(request: NextRequest) {
  if (!(await authorised(request))) return json({ error: "Unauthorized" }, 401);

  const setup = { database: supabaseConfigured(), buffer: bufferConfigured() };
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  let connected: PlatformId[] = [];
  let notice = "";

  if (setup.database) {
    try {
      posts = await listPosts();
    } catch (error) {
      notice = error instanceof Error ? error.message : "Could not load posts.";
    }
  }
  if (setup.buffer) {
    try {
      connected = connectedPlatforms(await listChannels());
    } catch (error) {
      notice = error instanceof Error ? error.message : "Could not reach Buffer.";
    }
  }
  return json({ setup, connected, posts, notice });
}

interface CreateBody {
  text?: unknown;
  platforms?: unknown;
  overrides?: unknown;
  mediaUrls?: unknown;
  scheduledLocal?: unknown;
}

export async function POST(request: NextRequest) {
  if (!(await authorised(request))) return json({ error: "Unauthorized" }, 401);
  if (!supabaseConfigured()) return json({ error: "The database is not configured yet." }, 503);
  if (!bufferConfigured()) return json({ error: "Buffer is not connected yet. Add BUFFER_ACCESS_TOKEN in Vercel." }, 503);

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const selected = Array.isArray(body.platforms)
    ? platformIds.filter((id) => (body.platforms as unknown[]).includes(id))
    : [];
  const mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls.filter((u): u is string => typeof u === "string") : [];
  const overridesIn = body.overrides && typeof body.overrides === "object" ? (body.overrides as Record<string, unknown>) : {};
  const dueAt = typeof body.scheduledLocal === "string" ? lagosToIso(body.scheduledLocal) : null;

  if (!selected.length) return json({ error: "Pick at least one platform." }, 400);
  if (!text) return json({ error: "Write something to post." }, 400);
  if (!dueAt) return json({ error: "Pick a date and time." }, 400);
  const lead = new Date(dueAt).getTime() - Date.now();
  if (lead < MIN_LEAD_MS) return json({ error: "Pick a time at least a few minutes from now." }, 400);
  if (lead > MAX_LEAD_MS) return json({ error: "Pick a time within the next year." }, 400);
  if (mediaUrls.length > MAX_IMAGES) return json({ error: `Attach at most ${MAX_IMAGES} images.` }, 400);
  if (!mediaUrls.every(isOwnMediaUrl)) return json({ error: "Only images from your library can be attached." }, 400);

  const overrides: Partial<Record<PlatformId, string>> = {};
  const finalText: Record<string, string> = {};
  for (const id of selected) {
    const raw = overridesIn[id];
    const custom = typeof raw === "string" ? raw.trim() : "";
    if (custom) overrides[id] = custom;
    const t = custom || text;
    const info = platformById[id];
    if (t.length > info.limit) return json({ error: `${info.label} allows ${info.limit} characters. This post has ${t.length}.` }, 400);
    if (info.needsImage && !mediaUrls.length) return json({ error: `${info.label} needs an image.` }, 400);
    finalText[id] = t;
  }

  let channels: BufferChannel[];
  try {
    channels = await listChannels();
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not reach Buffer." }, 502);
  }

  const refs: Partial<Record<PlatformId, string>> = {};
  const problems: string[] = [];
  for (const id of selected) {
    const label = platformById[id].label;
    const channel = channelFor(channels, id);
    if (!channel) {
      problems.push(`${label}: not connected in Buffer`);
      continue;
    }
    try {
      refs[id] = await schedulePost({ channel, platform: id, text: finalText[id], dueAt, imageUrls: mediaUrls });
    } catch (error) {
      problems.push(`${label}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  const sentCount = Object.keys(refs).length;
  const status: PostStatus = sentCount ? "scheduled" : "failed";
  try {
    const post = await insertPost({
      body: text,
      platforms: selected,
      overrides,
      media_urls: mediaUrls,
      scheduled_at: dueAt,
      status,
      provider_refs: refs,
      error: problems.length ? problems.join(" | ") : null,
    });
    return json({ post, problems }, sentCount ? 201 : 502);
  } catch (error) {
    // Buffer already has the post, so say so plainly rather than hiding it.
    const note = error instanceof Error ? error.message : "Could not save the log entry.";
    return json({ error: `${note} The post may still be scheduled in Buffer. Check there before retrying.`, problems }, 500);
  }
}

/** Removes a log entry. A post already queued in Buffer must be cancelled in Buffer. */
export async function DELETE(request: NextRequest) {
  if (!(await authorised(request))) return json({ error: "Unauthorized" }, 401);
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid id." }, 400);
  try {
    await deletePost(id);
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not delete." }, 500);
  }
}
