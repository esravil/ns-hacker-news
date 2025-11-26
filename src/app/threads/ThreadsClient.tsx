"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatTimeAgo } from "@/lib/time";

type ThreadRow = {
  id: number;
  title: string;
  created_at: string;
  author_id: string | null;
  author_display_name: string | null;
  score: number;
  url: string | null;
  url_domain: string | null;
  media_url: string | null;
  media_mime_type: string | null;
};

type VoteValue = -1 | 0 | 1;

interface ThreadsClientProps {
  initialThreads: ThreadRow[];
}

function getNextVoteValue(current: VoteValue, direction: 1 | -1): VoteValue {
  if (current === direction) return 0;
  return direction;
}

/**
 * Client-side component that renders the threads list with interactive voting.
 *
 * Layout:
 * - Each thread card is centered with a max width for a less-wide, polished look.
 * - Title and author live in the same row on the left, with a small gap.
 * - Timestamp is shown below the header row.
 * - If a URL is attached, show an "Open link" action with a domain chip.
 * - If an image is attached, show a small thumbnail preview.
 * - Under that, a horizontal vote bar with upvote / score / downvote.
 */
export default function ThreadsClient({ initialThreads }: ThreadsClientProps) {
  const { supabase, user, loading } = useAuth();
  const router = useRouter();

  const [threads, setThreads] = useState<ThreadRow[]>(initialThreads);
  const [votes, setVotes] = useState<Record<number, VoteValue>>({});
  const [voteError, setVoteError] = useState<string | null>(null);

  // Load existing votes for the current user on these threads
  useEffect(() => {
    if (!user || threads.length === 0) {
      setVotes({});
      return;
    }

    let cancelled = false;

    async function loadVotes() {
      try {
        const threadIds = threads.map((t) => t.id);
        const { data, error } = await supabase
          .from("votes")
          .select("target_id, value")
          .eq("user_id", user.id)
          .eq("target_type", "thread")
          .in("target_id", threadIds);

        if (cancelled) return;

        if (error) {
          console.error("Failed to load user thread votes", error);
          return;
        }

        const next: Record<number, VoteValue> = {};
        for (const row of (data ?? []) as any[]) {
          const targetId = row.target_id as number;
          const value = row.value as number;
          next[targetId] = value === 1 ? 1 : -1;
        }

        setVotes(next);
      } catch (err) {
        if (!cancelled) {
          console.error("Unexpected error loading user thread votes", err);
        }
      }
    }

    void loadVotes();

    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id, threads.length]);

  async function applyVote(threadId: number, direction: 1 | -1) {
    setVoteError(null);

    if (!user) {
      router.push("/auth");
      return;
    }

    const current = votes[threadId] ?? 0;
    const next = getNextVoteValue(current, direction);

    try {
      if (next === 0) {
        // Unvote: delete row
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("user_id", user.id)
          .eq("target_type", "thread")
          .eq("target_id", threadId);

        if (error) {
          console.error("Failed to remove vote", error);
          setVoteError("Could not update your vote.");
          return;
        }
      } else {
        // Upsert new vote
        const { error } = await supabase
          .from("votes")
          .upsert(
            {
              user_id: user.id,
              target_type: "thread",
              target_id: threadId,
              value: next,
            },
            { onConflict: "user_id,target_type,target_id" }
          );

        if (error) {
          console.error("Failed to save vote", error);
          setVoteError("Could not update your vote.");
          return;
        }
      }

      // Update local vote state
      setVotes((prev) => ({
        ...prev,
        [threadId]: next,
      }));

      // Update local thread scores
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                score: thread.score - current + next,
              }
            : thread
        )
      );
    } catch (err) {
      console.error("Unexpected error updating vote", err);
      setVoteError("Could not update your vote.");
    }
  }

  function renderVoteControls(thread: ThreadRow) {
    const current = votes[thread.id] ?? 0;
    const score = thread.score;

    return (
      <div className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        <button
          type="button"
          onClick={() => void applyVote(thread.id, 1)}
          className={[
            "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
            current === 1
              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900",
          ].join(" ")}
          aria-label="Upvote"
        >
          ▲
        </button>
        <span className="min-w-[1.5rem] text-center text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
          {score}
        </span>
        <button
          type="button"
          onClick={() => void applyVote(thread.id, -1)}
          className={[
            "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
            current === -1
              ? "border-red-500 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-950/40 dark:text-red-200"
              : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900",
          ].join(" ")}
          aria-label="Downvote"
        >
          ▼
        </button>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        No threads yet. Be the first to start a discussion.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {voteError && (
        <p className="text-[11px] text-red-600 dark:text-red-400">
          {voteError}
        </p>
      )}

      {loading && !user && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Checking your session…
        </p>
      )}

      <ul className="space-y-3">
        {threads.map((thread) => (
          <li key={thread.id} className="flex justify-center">
            <article className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Link
                        href={`/thread/${thread.id}`}
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        {thread.title}
                      </Link>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        ·{" "}
                        {thread.author_id ? (
                          <Link
                            href={`/u/${thread.author_id}`}
                            className="hover:underline"
                          >
                            {thread.author_display_name}
                          </Link>
                        ) : (
                          thread.author_display_name
                        )}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/thread/${thread.id}`}
                    className="hidden text-[11px] font-medium text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100 md:inline"
                  >
                    View
                  </Link>
                </div>

                <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {formatTimeAgo(thread.created_at)}
                </div>

                {thread.url && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                    <a
                      href={thread.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                    >
                      <span>Open link</span>
                      <span aria-hidden>↗</span>
                    </a>
                    {thread.url_domain && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                        {thread.url_domain}
                      </span>
                    )}
                  </div>
                )}

                {thread.media_url &&
                  (thread.media_mime_type == null ||
                    thread.media_mime_type.startsWith("image/")) && (
                    <div className="mt-1 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                      <img
                        src={thread.media_url}
                        alt=""
                        className="h-40 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                <div className="flex items-center gap-3">
                  {renderVoteControls(thread)}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}