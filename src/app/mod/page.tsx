"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatTimeAgo } from "@/lib/time";
import { useConfirm } from "@/components/ui/ConfirmProvider";

type ModThread = {
  id: number;
  title: string | null;
  body: string | null;
  created_at: string;
  is_deleted: boolean;
};

type ModComment = {
  id: number;
  thread_id: number;
  body: string | null;
  created_at: string;
  is_deleted: boolean;
};

type WorkingState = {
  threads: number[];
  comments: number[];
};

export default function ModDashboardPage() {
  const { user, loading, isAdmin, supabase } = useAuth();
  const confirm = useConfirm();

  const [threads, setThreads] = useState([] as ModThread[]);
  const [comments, setComments] = useState([] as ModComment[]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [workingIds, setWorkingIds] = useState<WorkingState>({
    threads: [],
    comments: [],
  });

  useEffect(() => {
    if (!user || !isAdmin) {
      setFetching(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setFetching(true);
      setError(null);

      try {
        const { data: threadRows, error: threadError } = await supabase
          .from("threads")
          .select("id, title, body, created_at, is_deleted")
          .order("created_at", { ascending: false })
          .limit(50);

        if (threadError) {
          throw threadError;
        }

        const { data: commentRows, error: commentError } = await supabase
          .from("comments")
          .select("id, thread_id, body, created_at, is_deleted")
          .order("created_at", { ascending: false })
          .limit(50);

        if (commentError) {
          throw commentError;
        }

        if (cancelled) return;

        setThreads((threadRows ?? []) as ModThread[]);
        setComments((commentRows ?? []) as ModComment[]);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load moderation data", err);
        setError("We couldn't load recent threads/comments for moderation.");
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id, isAdmin]);

  async function getAccessToken(): Promise<string | null> {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data?.session?.access_token) {
      console.error("Failed to get session for moderation", sessionError);
      setActionError(
        "We couldn't verify your session. Please refresh the page and try again."
      );
      return null;
    }
    return data.session.access_token;
  }

  function markThreadWorking(id: number, working: boolean) {
    setWorkingIds((prev) => ({
      ...prev,
      threads: working
        ? [...prev.threads, id]
        : prev.threads.filter((existing) => existing !== id),
    }));
  }

  function markCommentWorking(id: number, working: boolean) {
    setWorkingIds((prev) => ({
      ...prev,
      comments: working
        ? [...prev.comments, id]
        : prev.comments.filter((existing) => existing !== id),
    }));
  }

  async function handleRemoveThread(id: number) {
    const confirmed = await confirm({
      title: "Remove thread?",
      description:
        "This will remove the thread for everyone. The author will see it as [removed].",
      confirmLabel: "Remove thread",
      cancelLabel: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    setActionError(null);
    markThreadWorking(id, true);

    try {
      const token = await getAccessToken();
      if (!token) {
        markThreadWorking(id, false);
        return;
      }

      const response = await fetch("/api/admin/threads/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ threadId: id }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        const message =
          payload?.error ||
          "We couldn't remove this thread. Please try again.";
        setActionError(message);
        markThreadWorking(id, false);
        return;
      }

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === id ? { ...thread, is_deleted: true } : thread
        )
      );
    } catch (err) {
      console.error("Failed to remove thread", err);
      setActionError("We couldn't remove this thread. Please try again.");
    } finally {
      markThreadWorking(id, false);
    }
  }

  async function handleRemoveComment(id: number) {
    const confirmed = await confirm({
      title: "Remove comment?",
      description:
        "This will remove the comment for everyone. The author will see it as [removed].",
      confirmLabel: "Remove comment",
      cancelLabel: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    setActionError(null);
    markCommentWorking(id, true);

    try {
      const token = await getAccessToken();
      if (!token) {
        markCommentWorking(id, false);
        return;
      }

      const response = await fetch("/api/admin/comments/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commentId: id }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        const message =
          payload?.error ||
          "We couldn't remove this comment. Please try again.";
        setActionError(message);
        markCommentWorking(id, false);
        return;
      }

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === id ? { ...comment, is_deleted: true } : comment
        )
      );
    } catch (err) {
      console.error("Failed to remove comment", err);
      setActionError("We couldn't remove this comment. Please try again.");
    } finally {
      markCommentWorking(id, false);
    }
  }

  if (loading) {
    return (
      <section className="flex flex-1 items-center justify-center py-10">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Checking your session…
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="flex flex-1 items-center justify-center py-10">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          You need to sign in to access moderation tools.
        </p>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="flex flex-1 items-center justify-center py-10">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          You do not have moderator access on this account.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6 py-4">
      <header className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Moderation
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Moderator tools
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Quickly remove abusive content. Removals show as{" "}
          <span className="font-mono text-[11px]">[removed]</span> to regular
          users.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {actionError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Recent threads
          </h2>
          {fetching && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Loading threads…
            </p>
          )}
          {!fetching && threads.length === 0 && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              No threads found.
            </p>
          )}
          <ul className="space-y-2">
            {threads.map((thread) => {
              const working = workingIds.threads.includes(thread.id);
              const removed = thread.is_deleted;

              return (
                <li
                  key={thread.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/thread/${thread.id}`}
                          className="text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                        >
                          {thread.title || "(no title)"}
                        </Link>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {formatTimeAgo(thread.created_at)}
                        </span>
                        {removed && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/40 dark:text-red-200">
                            removed
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                        {removed
                          ? "[removed]"
                          : thread.body || "No body text."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveThread(thread.id)}
                      disabled={removed || working}
                      className="inline-flex items-center rounded-md bg-red-600 px-2 py-1 text-[10px] font-medium text-red-50 shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                      {removed ? "Removed" : working ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Recent comments
          </h2>
          {fetching && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Loading comments…
            </p>
          )}
          {!fetching && comments.length === 0 && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              No comments found.
            </p>
          )}
          <ul className="space-y-2">
            {comments.map((comment) => {
              const working = workingIds.comments.includes(comment.id);
              const removed = comment.is_deleted;

              return (
                <li
                  key={comment.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/thread/${comment.thread_id}#comment-${comment.id}`}
                          className="text-[11px] font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                        >
                          Comment #{comment.id}
                        </Link>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {formatTimeAgo(comment.created_at)}
                        </span>
                        {removed && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/40 dark:text-red-200">
                            removed
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                        {removed
                          ? "[removed]"
                          : comment.body || "No body text."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveComment(comment.id)}
                      disabled={removed || working}
                      className="inline-flex items-center rounded-md bg-red-600 px-2 py-1 text-[10px] font-medium text-red-50 shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                      {removed ? "Removed" : working ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}