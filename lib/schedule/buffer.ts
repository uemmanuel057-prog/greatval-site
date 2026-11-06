import "server-only";
import { platformById, platforms, type PlatformId } from "./platforms";

/**
 * Server-only Buffer client (GraphQL over plain fetch).
 * The access token comes from BUFFER_ACCESS_TOKEN and never reaches the browser.
 */

const ENDPOINT = process.env.BUFFER_API_URL ?? "https://api.buffer.com";

export interface BufferChannel {
  id: string;
  name: string;
  service: string;
}

export function bufferConfigured(): boolean {
  return Boolean(process.env.BUFFER_ACCESS_TOKEN);
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) throw new Error("Buffer is not configured. Set BUFFER_ACCESS_TOKEN.");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) throw new Error("Buffer rejected the access token. Create a new key and update it in Vercel.");
  if (!res.ok) throw new Error(`Buffer request failed (${res.status}).`);
  const payload = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  if (!payload.data) throw new Error("Buffer returned no data.");
  return payload.data;
}

export async function listChannels(): Promise<BufferChannel[]> {
  const orgs = await gql<{ account: { organizations: { id: string }[] } }>(
    "query { account { organizations { id } } }",
  );
  const organizationId = process.env.BUFFER_ORGANIZATION_ID ?? orgs.account.organizations[0]?.id;
  if (!organizationId) return [];
  const data = await gql<{ channels: BufferChannel[] }>(
    `query { channels(input: { organizationId: ${JSON.stringify(organizationId)} }) { id name service } }`,
  );
  return data.channels;
}

/** Which of our platforms have a connected Buffer channel. */
export function channelFor(channels: BufferChannel[], platform: PlatformId): BufferChannel | undefined {
  return channels.find((c) => c.service === platformById[platform].bufferService);
}

export function connectedPlatforms(channels: BufferChannel[]): PlatformId[] {
  return platforms.filter((p) => channelFor(channels, p.id)).map((p) => p.id);
}

interface CreatePostResult {
  createPost: { post?: { id: string }; message?: string };
}

/** A bare GraphQL enum word, such as automatic. */
class Enum {
  constructor(readonly word: string) {}
}

/**
 * Turns a plain value into a GraphQL literal. The values are written inline, as in
 * Buffer's own examples, so no schema type names have to be guessed.
 */
function lit(value: unknown): string {
  if (value instanceof Enum) return value.word;
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return `[${value.map(lit).join(", ")}]`;
  if (value && typeof value === "object") {
    return `{ ${Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${lit(v)}`)
      .join(", ")} }`;
  }
  throw new Error("Unsupported value");
}

/** Schedules one post on one channel. Returns Buffer's post id. */
export async function schedulePost(args: {
  channel: BufferChannel;
  platform: PlatformId;
  text: string;
  dueAt: string;
  imageUrls: string[];
}): Promise<string> {
  const input: Record<string, unknown> = {
    channelId: args.channel.id,
    text: args.text,
    schedulingType: new Enum("automatic"),
    mode: new Enum("customScheduled"),
    dueAt: args.dueAt,
  };
  if (args.imageUrls.length) input.assets = args.imageUrls.map((url) => ({ image: { url } }));
  if (args.platform === "instagram") input.metadata = { instagram: { type: new Enum("post"), shouldShareToFeed: true } };
  if (args.platform === "facebook") input.metadata = { facebook: { type: new Enum("post") } };

  const data = await gql<CreatePostResult>(`mutation {
  createPost(input: ${lit(input)}) {
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  }
}`);
  if (data.createPost.message) throw new Error(data.createPost.message);
  if (!data.createPost.post) throw new Error("Buffer did not confirm the post.");
  return data.createPost.post.id;
}
