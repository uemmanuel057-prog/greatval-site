/** Platforms the Command Center can post to, and their text limits. */

export const platformIds = ["x", "facebook", "instagram", "linkedin"] as const;
export type PlatformId = (typeof platformIds)[number];

export interface PlatformInfo {
  id: PlatformId;
  label: string;
  /** Buffer's name for the service on a channel. */
  bufferService: string;
  /** Character limit for the post text. */
  limit: number;
  /** True when the platform will not accept a post without an image. */
  needsImage: boolean;
}

export const platforms: PlatformInfo[] = [
  { id: "x", label: "X", bufferService: "twitter", limit: 280, needsImage: false },
  { id: "facebook", label: "Facebook", bufferService: "facebook", limit: 5000, needsImage: false },
  { id: "instagram", label: "Instagram", bufferService: "instagram", limit: 2200, needsImage: true },
  { id: "linkedin", label: "LinkedIn", bufferService: "linkedin", limit: 3000, needsImage: false },
];

export const platformById = Object.fromEntries(platforms.map((p) => [p.id, p])) as Record<PlatformId, PlatformInfo>;

export type PostStatus = "draft" | "scheduled" | "sent" | "failed" | "cancelled";

export interface ScheduledPost {
  id: string;
  body: string;
  platforms: PlatformId[];
  overrides: Partial<Record<PlatformId, string>>;
  media_urls: string[];
  scheduled_at: string;
  status: PostStatus;
  provider_refs: Partial<Record<PlatformId, string>>;
  error: string | null;
  created_at: string;
}

export interface MediaItem {
  name: string;
  url: string;
}

/** Lagos is UTC+1 all year, so a local date and time converts with a fixed offset. */
export function lagosToIso(localDateTime: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDateTime)) return null;
  const date = new Date(`${localDateTime}:00+01:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatLagos(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
