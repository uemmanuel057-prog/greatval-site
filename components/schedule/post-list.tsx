"use client";

import { Trash2 } from "lucide-react";
import { formatLagos, platformById, type PostStatus, type ScheduledPost } from "@/lib/schedule/platforms";

const statusStyle: Record<PostStatus, string> = {
  draft: "border-white/15 text-ink-muted",
  scheduled: "border-accent/60 text-accent",
  sent: "border-emerald-400/50 text-emerald-300",
  failed: "border-red-400/50 text-red-300",
  cancelled: "border-white/15 text-ink-subtle",
};

/** Log of posts the Command Center has sent to Buffer. */
export function PostList({
  posts,
  onRemove,
}: {
  posts: ScheduledPost[];
  onRemove: (id: string) => void;
}) {
  if (!posts.length) return <p className="text-sm text-ink-subtle">No posts yet. Scheduled posts show up here.</p>;

  return (
    <ul className="space-y-3">
      {posts.map((post) => (
        <li key={post.id} className="card !p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 font-mono text-xs uppercase ${statusStyle[post.status]}`}>
              {post.status}
            </span>
            <span className="font-mono text-xs text-ink-subtle">{formatLagos(post.scheduled_at)} (Lagos)</span>
            <span className="text-xs text-ink-muted">{post.platforms.map((p) => platformById[p].label).join(", ")}</span>
            {post.media_urls.length ? (
              <span className="text-xs text-ink-subtle">
                {post.media_urls.length} image{post.media_urls.length > 1 ? "s" : ""}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(post.id)}
              aria-label="Remove from log"
              className="ml-auto inline-flex items-center gap-1.5 text-xs text-ink-subtle transition-colors hover:text-red-300"
            >
              <Trash2 size={14} aria-hidden="true" />
              Remove from log
            </button>
          </div>
          <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-ink">{post.body}</p>
          {post.error ? <p className="mt-2 text-xs text-red-300">{post.error}</p> : null}
        </li>
      ))}
      <li className="text-xs text-ink-subtle">
        Removing a post here only clears this log. To cancel a post that is already queued, delete it in Buffer.
      </li>
    </ul>
  );
}
