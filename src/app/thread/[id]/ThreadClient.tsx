"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatTimeAgo } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";

type Thread = {
  id: number;
  title: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author_display_name: string | null;
  url: string | null;
  url_domain: string | null;
  media_url: string | null;
  media_mime_type: string | null;
};

type Comment = {
  id: number;
  body: string;
  created_at: string;
  author_id: string | null;
  parent_id: number | null;
  author_display_name: string | null;
};

type CommentNode = Comment & {
  children: CommentNode[];
};

type ThreadClientProps = {
  thread: Thread;
  initialComments: Comment[];
  initialThreadScore: number;
  initialCommentScores: Record<number, number>;
};

type VoteValue = -1 | 0 | 1;
type VoteKey = string;

const MAX_NESTING_DEPTH = 6;

function makeVoteKey(type: "thread" | "comment", id: number): VoteKey {
  return `${type}:${id}`;
}

function getNextVoteValue(current: VoteValue, direction: 1 | -1): VoteValue {
  if (current === direction) return 0;
  return direction;
}

function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodesById = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodesById.set(comment.id, { ...comment, children: [] });
  }

  for (const node of nodesById.values()) {
    if (node.parent_id && nodesById.has(node.parent_id)) {
      const parent = nodesById.get(node.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default function ThreadClient({
  thread,
  initialComments,
  initialThreadScore,
  initialCommentScores,
}: ThreadClientProps) {
  const { user, supabase, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [threadScore, setThreadScore] = useState<number>(initialThreadScore);
  const [commentScores, setCommentScores] = useState<Record<number, number>>(
    initialCommentScores
  );
  const [votes, setVotes] = useState<Record<VoteKey, VoteValue>>({});
  const [focusedCommentId, setFocusedCommentId] = useState<number | null>(null);

  const [commentBody, setCommentBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isCommentBoxExpanded, setIsCommentBoxExpanded] = useState(false);

  const commentTree = useMemo<CommentNode[]>(() => {
    return buildCommentTree(comments);
  }, [comments]);

  const {
    commentIndexById,
    orderedCommentIds,
    parentById,
    rootById,
  } = useMemo(() => {
    const indexMap = new Map<number, number>();
    const parentMap = new Map<number, number | null>();

    comments.forEach((c, index) => {
      indexMap.set(c.id, index);
      parentMap.set(c.id, c.parent_id);
    });

    const rootMap = new Map<number, number>();

    function findRoot(id: number): number {
      if (rootMap.has(id)) return rootMap.get(id)!;
      const parentId = parentMap.get(id);
      if (!parentId) {
        rootMap.set(id, id);
        return id;
      }
      const root = findRoot(parentId);
      rootMap.set(id, root);
      return root;
    }

    comments.forEach((c) => {
      findRoot(c.id);
    });

    return {
      commentIndexById: indexMap,
      orderedCommentIds: comments.map((c) => c.id),
      parentById: parentMap,
      rootById: rootMap,
    };
  }, [comments]);

  useEffect(() => {
    if (focusedCommentId == null) return;

    const timeoutId = window.setTimeout(() => {
      setFocusedCommentId(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [focusedCommentId]);

  // Load current user's votes for this thread and its comments
  useEffect(() => {
    if (!user) {
      setVotes({});
      return;
    }

    let cancelled = false;

    async function loadVotes() {
      try {
        const next: Record<VoteKey, VoteValue> = {};

        // Thread vote
        const {
          data: threadVoteData,
          error: threadVoteError,
        } = await supabase
          .from("votes")
          .select("target_id, value")
          .eq("user_id", user.id)
          .eq("target_type", "thread")
          .eq("target_id", thread.id);

        if (threadVoteError) {
          console.error("Failed to load user thread vote", threadVoteError);
        } else {
          for (const row of (threadVoteData ?? []) as any[]) {
            const value = row.value as number;
            const key = makeVoteKey("thread", row.target_id as number);
            next[key] = value === 1 ? 1 : -1;
          }
        }

        // Comment votes
        const commentIds = comments.map((c) => c.id);
        if (commentIds.length > 0) {
          const {
            data: commentVoteData,
            error: commentVoteError,
          } = await supabase
            .from("votes")
            .select("target_id, value")
            .eq("user_id", user.id)
            .eq("target_type", "comment")
            .in("target_id", commentIds);

          if (commentVoteError) {
            console.error(
              "Failed to load user comment votes",
              commentVoteError
            );
          } else {
            for (const row of (commentVoteData ?? []) as any[]) {
              const value = row.value as number;
              const key = makeVoteKey("comment", row.target_id as number);
              next[key] = value === 1 ? 1 : -1;
            }
          }
        }

        if (!cancelled) {
          setVotes(next);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Unexpected error loading user votes", err);
        }
      }
    }

    void loadVotes();

    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id, thread.id, comments.length]);

  function scrollToComment(targetId: number) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(`comment-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function focusAndScrollToComment(targetId: number) {
    scrollToComment(targetId);
    setFocusedCommentId(targetId);
  }

  function goToRootComment(commentId: number) {
    const rootId = rootById.get(commentId);
    if (!rootId || rootId === commentId) return;
    focusAndScrollToComment(rootId);
  }

  function goToParentComment(commentId: number) {
    const parentId = parentById.get(commentId);
    if (!parentId) return;
    focusAndScrollToComment(parentId);
  }

  function goToPrevComment(commentId: number) {
    const idx = commentIndexById.get(commentId);
    if (idx == null || idx <= 0) return;
    const prevId = orderedCommentIds[idx - 1];
    if (prevId != null) {
      focusAndScrollToComment(prevId);
    }
  }

  function goToNextComment(commentId: number) {
    const idx = commentIndexById.get(commentId);
    if (
      idx == null ||
      orderedCommentIds.length === 0 ||
      idx >= orderedCommentIds.length - 1
    ) {
      return;
    }
    const nextId = orderedCommentIds[idx + 1];
    if (nextId != null) {
      focusAndScrollToComment(nextId);
    }
  }

  const isOwner =
    !!user && !!thread.author_id && user.id === thread.author_id;

  const threadAuthorDisplayName =
    (thread.author_display_name && thread.author_display_name.trim()) ||
    (thread.author_id
      ? `user-${thread.author_id.slice(0, 8)}`
      : "anonymous");

  async function handleDeleteThread() {
    if (!user) {
      router.push("/auth");
      return;
    }

    setDeleteError(null);

    try {
      const { error } = await supabase.rpc("soft_delete_thread", {
        p_thread_id: thread.id,
      });

      if (error) {
        console.error("Failed to delete thread", error);
        setDeleteError("Could not delete this thread.");
        return;
      }

      showToast("Thread deleted successfully.");
      router.replace("/");
    } catch (err) {
      console.error("Unexpected error deleting thread", err);
      setDeleteError("Could not delete this thread.");
    }
  }

  async function handleSubmitComment(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      router.push("/auth");
      return;
    }

    const trimmed = commentBody.trim();
    if (!trimmed) {
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          thread_id: thread.id,
          author_id: user.id,
          body: trimmed,
        })
        .select("id, body, created_at, author_id, parent_id")
        .single<any>();

      if (error) {
        console.error("Failed to post comment", error);
        setCommentError("Could not post your comment.");
        setCommentSubmitting(false);
        return;
      }

      const newComment: Comment = {
        id: data.id as number,
        body: data.body as string,
        created_at: data.created_at as string,
        author_id: (data.author_id as string | null) ?? null,
        parent_id: (data.parent_id as number | null) ?? null,
        author_display_name: null,
      };

      setComments((prev) => [...prev, newComment]);
      setCommentBody("");
      setIsCommentBoxExpanded(false);
      setCommentScores((prev) => ({
        ...prev,
        [newComment.id]: 0,
      }));
    } catch (err) {
      console.error("Unexpected error posting comment", err);
      setCommentError("Could not post your comment.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleSubmitReply(event: FormEvent, parentId: number) {
    event.preventDefault();
    if (!user) {
      router.push("/auth");
      return;
    }

    const trimmed = replyBody.trim();
    if (!trimmed) {
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          thread_id: thread.id,
          author_id: user.id,
          parent_id: parentId,
          body: trimmed,
        })
        .select("id, body, created_at, author_id, parent_id")
        .single<any>();

      if (error) {
        console.error("Failed to post reply", error);
        setCommentError("Could not post your reply.");
        setCommentSubmitting(false);
        return;
      }

      const newComment: Comment = {
        id: data.id as number,
        body: data.body as string,
        created_at: data.created_at as string,
        author_id: (data.author_id as string | null) ?? null,
        parent_id: (data.parent_id as number | null) ?? null,
        author_display_name: null,
      };

      setComments((prev) => [...prev, newComment]);
      setReplyBody("");
      setReplyingTo(null);
      setCommentScores((prev) => ({
        ...prev,
        [newComment.id]: 0,
      }));
    } catch (err) {
      console.error("Unexpected error posting reply", err);
      setCommentError("Could not post your reply.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!user) {
      router.push("/auth");
      return;
    }

    setDeleteError(null);

    try {
      const { error } = await supabase.rpc("soft_delete_comment", {
        p_comment_id: commentId,
      });

      if (error) {
        console.error("Failed to delete comment", error);
        setDeleteError("Could not delete a comment.");
        return;
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentScores((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });

      if (replyingTo === commentId) {
        setReplyingTo(null);
        setReplyBody("");
      }

      showToast("Comment deleted successfully.");
    } catch (err) {
      console.error("Unexpected error deleting comment", err);
      setDeleteError("Could not delete a comment.");
    }
  }

  async function applyVote(
    targetType: "thread" | "comment",
    targetId: number,
    direction: 1 | -1
  ) {
    setVoteError(null);

    if (!user) {
      router.push("/auth");
      return;
    }

    const key = makeVoteKey(targetType, targetId);
    const current = votes[key] ?? 0;
    const next = getNextVoteValue(current, direction);

    try {
      if (next === 0) {
        // Unvote: delete row
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("user_id", user.id)
          .eq("target_type", targetType)
          .eq("target_id", targetId);

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
              target_type: targetType,
              target_id: targetId,
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

      // Update local state for vote + scores
      setVotes((prev) => ({
        ...prev,
        [key]: next,
      }));

      if (targetType === "thread") {
        setThreadScore((prev) => prev - current + next);
      } else {
        setCommentScores((prev) => ({
          ...prev,
          [targetId]: (prev[targetId] ?? 0) - current + next,
        }));
      }
    } catch (err) {
      console.error("Unexpected error updating vote", err);
      setVoteError("Could not update your vote.");
    }
  }

  function renderVoteControls(
    targetType: "thread" | "comment",
    targetId: number,
    score: number
  ) {
    const key = makeVoteKey(targetType, targetId);
    const current = votes[key] ?? 0;

    return (
      <div className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        <button
          type="button"
          onClick={() => void applyVote(targetType, targetId, 1)}
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
          onClick={() => void applyVote(targetType, targetId, -1)}
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

  function renderCommentNodes(nodes: CommentNode[], depth = 0): JSX.Element[] {
    return nodes.map((node) => {
      const clampedDepth = Math.min(depth, MAX_NESTING_DEPTH);
      const indentStyle =
        clampedDepth > 0
          ? { marginLeft: `${clampedDepth * 0.75}rem` }
          : undefined;

      const isCommentOwner =
        !!user && !!node.author_id && user.id === node.author_id;
      const score = commentScores[node.id] ?? 0;

      const authorLabel =
        (node.author_display_name && node.author_display_name.trim()) ||
        (node.author_id ? `user-${node.author_id.slice(0, 8)}` : "anonymous");

      const isFocused = focusedCommentId === node.id;

      return (
        <li
          key={node.id}
          id={`comment-${node.id}`}
          className={[
            "space-y-1 rounded-md",
            isFocused
              ? "bg-zinc-50 ring-1 ring-zinc-300 dark:bg-zinc-900/40 dark:ring-zinc-600"
              : "",
          ].join(" ")}
        >
          <div
            style={indentStyle}
            className={
              clampedDepth > 0
                ? "border-l border-zinc-200 pl-3 dark:border-zinc-800"
                : ""
            }
          >
            <div className="space-y-1 text-sm text-zinc-800 dark:text-zinc-200">
              <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                {node.author_id ? (
                  <Link
                    href={`/u/${node.author_id}`}
                    className="hover:underline"
                  >
                    {authorLabel}
                  </Link>
                ) : (
                  <span>{authorLabel}</span>
                )}
                <span className="text-[10px] text-zinc-400">•</span>
                <span className="font-normal">
                  {formatTimeAgo(node.created_at)}
                </span>
              </div>

              <p className="whitespace-pre-wrap">{node.body}</p>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                {renderVoteControls("comment", node.id, score)}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  {rootById.get(node.id) &&
                    rootById.get(node.id) !== node.id && (
                      <button
                        type="button"
                        onClick={() => goToRootComment(node.id)}
                        className="text-zinc-500 hover:underline dark:text-zinc-400"
                      >
                        root
                      </button>
                    )}
                  {node.parent_id && (
                    <button
                      type="button"
                      onClick={() => goToParentComment(node.id)}
                      className="text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      parent
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => goToPrevComment(node.id)}
                    disabled={(commentIndexById.get(node.id) ?? 0) === 0}
                    className="text-zinc-500 hover:underline disabled:opacity-40 disabled:no-underline dark:text-zinc-400"
                  >
                    prev
                  </button>
                  <button
                    type="button"
                    onClick={() => goToNextComment(node.id)}
                    disabled={
                      (commentIndexById.get(node.id) ?? 0) ===
                      (orderedCommentIds.length > 0
                        ? orderedCommentIds.length - 1
                        : 0)
                    }
                    className="text-zinc-500 hover:underline disabled:opacity-40 disabled:no-underline dark:text-zinc-400"
                  >
                    next
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      router.push("/auth");
                      return;
                    }
                    setReplyingTo(node.id);
                    setReplyBody("");
                    setCommentError(null);
                  }}
                  className="text-[10px] font-medium text-zinc-500 hover:underline dark:text-zinc-400"
                >
                  Reply
                </button>
                {isCommentOwner && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteComment(node.id)}
                    className="text-[10px] text-red-600 hover:underline dark:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>

              {replyingTo === node.id && (
                <form
                  onSubmit={(event) => void handleSubmitReply(event, node.id)}
                  className="mt-2 space-y-2"
                >
                  <textarea
                    rows={3}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write your reply…"
                    className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
                  />
                  {commentError && (
                    <p className="text-[11px] text-red-600 dark:text-red-400">
                      {commentError}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={commentSubmitting}
                      className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {commentSubmitting ? "Replying…" : "Post reply"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyBody("");
                        setCommentError(null);
                      }}
                      className="text-[10px] text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {node.children.length > 0 && (
            <ul className="mt-2 space-y-2">
              {renderCommentNodes(node.children, depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  }

  return (
    <>
      <section className="space-y-6">
        <article className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <header className="space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {thread.title}
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {formatTimeAgo(thread.created_at)}
              </p>
            </div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {thread.author_id ? (
                <Link
                  href={`/u/${thread.author_id}`}
                  className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  {threadAuthorDisplayName}
                </Link>
              ) : (
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {threadAuthorDisplayName}
                </span>
              )}
            </div>
          </header>

          {thread.url && (
            <div className="space-y-2">
              <div className="inline-flex flex-wrap items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200">
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
            </div>
          )}

          {thread.media_url &&
            (thread.media_mime_type == null ||
              thread.media_mime_type.startsWith("image/")) && (
              <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <img
                  src={thread.media_url}
                  alt={thread.title || "Thread media"}
                  className="h-auto max-h-[26rem] w-full object-contain"
                />
              </div>
            )}

          <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {thread.body}
          </p>

          <div className="mt-2 flex items-center justify-between">
            <div>{renderVoteControls("thread", thread.id, threadScore)}</div>
            {isOwner && (
              <button
                type="button"
                onClick={() => void handleDeleteThread()}
                className="text-[11px] text-red-600 hover:underline dark:text-red-400"
              >
                Delete thread
              </button>
            )}
          </div>

          {deleteError && (
            <p className="text-[11px] text-red-600 dark:text-red-400">
              {deleteError}
            </p>
          )}
        </article>

        {/* Primary comment composer: directly under the post, above the comments list */}
        <div className="rounded-lg bg-white pt-3 pb-3 text-xs text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
          {loading ? (
            <p>Checking your session…</p>
          ) : user ? (
            <form onSubmit={handleSubmitComment} className="space-y-2">
              <div
                className={[
                  "relative rounded-md border bg-white text-xs shadow-sm transition dark:bg-zinc-950",
                  isCommentBoxExpanded
                    ? "border-zinc-900 ring-1 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
                    : "cursor-text border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:bg-zinc-900",
                ].join(" ")}
                onClick={() => {
                  if (!isCommentBoxExpanded) {
                    setIsCommentBoxExpanded(true);
                  }
                }}
              >
                {isCommentBoxExpanded ? (
                  <textarea
                    id="new-comment"
                    rows={4}
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Write a comment…"
                    className="block w-full rounded-md border-0 bg-transparent px-1 py-2 text-xs text-zinc-900 outline-none ring-0 placeholder:text-zinc-400 dark:text-zinc-100"
                  />
                ) : (
                  <div className="px-1 py-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Write a comment…
                  </div>
                )}
              </div>
              {commentError && replyingTo === null && (
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  {commentError}
                </p>
              )}
              {isCommentBoxExpanded && (
                <div className="space-y-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <p>
                    {commentBody.length > 0
                      ? `${commentBody.length} character${
                          commentBody.length === 1 ? "" : "s"
                        }`
                      : "If you haven't already, would you mind reading about our approach to comments and site guidelines?"
                    }
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={commentSubmitting || !commentBody.trim()}
                      className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {commentSubmitting ? "Posting…" : "Post"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCommentBoxExpanded(false);
                        setCommentBody("");
                        setCommentError(null);
                      }}
                      className="text-[10px] text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>
                <span className="font-medium">Want to join the discussion?</span>{" "}
                <span>
                  Sign in with a wallet or email to post comments.
                </span>
              </p>
              <Link
                href="/auth"
                className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>

        <section className="space-y-3">
          <header className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Comments
            </h2>
            {voteError && (
              <p className="text-[11px] text-red-600 dark:text-red-400">
                {voteError}
              </p>
            )}
          </header>

          {commentTree.length === 0 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              No comments yet. Be the first to reply.
            </p>
          )}

          {commentTree.length > 0 && (
            <ul className="space-y-2">{renderCommentNodes(commentTree)}</ul>
          )}

          {deleteError && (
            <p className="text-[11px] text-red-600 dark:text-red-400">
              {deleteError}
            </p>
          )}
        </section>
      </section>
    </>
  );
}