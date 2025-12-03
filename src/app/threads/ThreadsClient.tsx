"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatTimeAgo } from "@/lib/time";
import { VoteControls } from "@/components/votes/VoteControls";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";

type ThreadRow = {
  id: number;
  title: string;
  body?: string | null;
  created_at: string;
  author_id: string | null;
  author_display_name: string | null;
  score: number;
  comment_count: number;
  url: string | null;
  url_domain: string | null;
  media_url: string | null;
  media_mime_type: string | null;
};

type VoteValue = -1 | 0 | 1;

interface ThreadsClientProps {
  initialThreads: ThreadRow[];
  showBodyPreview?: boolean;
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
export default function ThreadsClient({
  initialThreads,
  showBodyPreview = false,
}: ThreadsClientProps) {
  const { supabase, user, loading } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const [threads, setThreads] = useState<ThreadRow[]>(initialThreads);
  const [votes, setVotes] = useState<Record<number, VoteValue>>({});
  const [voteError, setVoteError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);

  // Threads list is already filtered on the server to exclude deleted threads.

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

  async function handleDeleteThread(thread: ThreadRow) {
    if (!user) {
      router.push("/auth");
      return;
    }

    setDeleteError(null);

    try {
      const ok = await confirm({
        title: "Delete this thread?",
        description: "This will remove your thread from the listing for everyone.",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      });

      if (!ok) {
        return;
      }

      const { error } = await supabase.rpc("soft_delete_thread", {
        p_thread_id: thread.id,
      });

      if (error) {
        console.error("Failed to delete thread", error);
        setDeleteError("Could not delete this thread.");
        return;
      }

      setThreads((prev) => prev.filter((t) => t.id !== thread.id));
      showToast("Thread deleted successfully.");
    } catch (err) {
      console.error("Unexpected error deleting thread", err);
      setDeleteError("Could not delete this thread.");
    }
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

      {deleteError && (
        <p className="text-[11px] text-red-600 dark:text-red-400">
          {deleteError}
        </p>
      )}

      {loading && !user && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Checking your session…
        </p>
      )}

      <ul className="space-y-3">
        {threads.map((thread) => {
          const current = votes[thread.id] ?? 0;

          const rawDisplayName =
            thread.author_display_name && thread.author_display_name.trim();
          const shortId =
            thread.author_id && thread.author_id.length >= 8
              ? thread.author_id.slice(0, 4)
              : null;
          const authorLabel =
            rawDisplayName && shortId
              ? `${rawDisplayName} · ${shortId}`
              : shortId ?? rawDisplayName ?? "anonymous";

          const bodyPreview =
            showBodyPreview && thread.body
              ? `${thread.body.trim().slice(0, 200)}${
                  thread.body.trim().length > 200 ? "…" : ""
                }`
              : null;

          return (
            <li key={thread.id}>
              <article
                onClick={() => router.push(`/thread/${thread.id}`)}
                className="w-full max-w-2xl cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              >
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
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              {authorLabel}
                            </Link>
                          ) : (
                            authorLabel
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1">
                      <button
                        type="button"
                        aria-label="Bookmark thread"
                        className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <span aria-hidden>★</span>
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="Thread actions"
                          className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenFor((prev) =>
                              prev === thread.id ? null : thread.id
                            );
                          }}
                        >
                          <span aria-hidden>⋯</span>
                        </button>
                        {menuOpenFor === thread.id &&
                          user &&
                          user.id === thread.author_id && (
                            <div className="absolute right-0 z-10 mt-1 w-32 rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                              <button
                                type="button"
                                className="block w-full px-3 py-1 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenFor(null);
                                  void handleDeleteThread(thread);
                                }}
                              >
                                Delete post
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {formatTimeAgo(thread.created_at)}
                  </div>

                  {bodyPreview && (
                    <p className="text-s text-zinc-700 dark:text-zinc-300">
                      {bodyPreview}
                    </p>
                  )}

                  {thread.url && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      <a
                        href={thread.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
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

                  <div className="mt-3 -mx-4 border-t border-zinc-100 dark:border-zinc-800" />

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <VoteControls
                        targetType="thread"
                        targetId={thread.id}
                        score={thread.score}
                        currentVote={current}
                        onVote={(_, targetId, direction) =>
                          void applyVote(targetId, direction)
                        }
                      />
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {thread.comment_count === 0 ? (
                        <span>Be the first to comment</span>
                      ) : (
                        <span>
                          {thread.comment_count} comment
                          {thread.comment_count === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}