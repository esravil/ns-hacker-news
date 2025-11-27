"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatTimeAgo } from "@/lib/time";
import { useToast } from "@/components/ui/ToastProvider";
import scrollIntoView from "scroll-into-view-if-needed";
import { buildCommentTree, MAX_NESTING_DEPTH } from "./commentTree";
import type {
  Thread,
  Comment,
  CommentNode,
  VoteValue,
  VoteKey,
} from "./threadTypes";
import { VoteControls } from "@/components/votes/VoteControls";
import { CommentComposer } from "./components/CommentComposer";

type ThreadClientProps = {
  thread: Thread;
  initialComments: Comment[];
  initialThreadScore: number;
  initialCommentScores: Record<number, number>;
};

function makeVoteKey(type: "thread" | "comment", id: number): VoteKey {
  return `${type}:${id}`;
}

function getNextVoteValue(current: VoteValue, direction: 1 | -1): VoteValue {
  if (current === direction) return 0;
  return direction;
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
    parentById,
    rootById,
    topLevelIds,
    topLevelIndexById,
    siblingsByParentId,
    siblingIndexById,
  } = useMemo(() => {
    const parentMap = new Map<number, number | null>();
    const rootMap = new Map<number, number>();
    const siblingsMap = new Map<number | null, number[]>();
    const byId = new Map<number, Comment>();

    // Build parent map, sibling lists, and id -> comment map
    comments.forEach((c) => {
      parentMap.set(c.id, c.parent_id);
      byId.set(c.id, c);

      const key = c.parent_id ?? null;
      const existing = siblingsMap.get(key);
      if (existing) {
        existing.push(c.id);
      } else {
        siblingsMap.set(key, [c.id]);
      }
    });

    // Resolve root (top-level ancestor) for each comment
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

    // Top-level comments (no parent) — sort freshest first by created_at
    const topLevelIds = (siblingsMap.get(null) ?? []).slice();
    topLevelIds.sort((aId, bId) => {
      const a = byId.get(aId)!;
      const b = byId.get(bId)!;
      if (a.created_at === b.created_at) return 0;
      // Later created_at should come first (freshest at the top)
      return a.created_at < b.created_at ? 1 : -1;
    });

    const topLevelIndexById = new Map<number, number>();
    topLevelIds.forEach((id, index) => {
      topLevelIndexById.set(id, index);
    });

    // Sibling index map for replies (per parent)
    const siblingIndexById = new Map<number, number>();
    siblingsMap.forEach((ids, parentId) => {
      if (parentId === null) return; // skip top-level; handled separately
      ids.forEach((id, idx) => {
        siblingIndexById.set(id, idx);
      });
    });

    return {
      parentById: parentMap,
      rootById: rootMap,
      topLevelIds,
      topLevelIndexById,
      siblingsByParentId: siblingsMap,
      siblingIndexById,
    };
  }, [comments]);

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
    if (!el) return;

    scrollIntoView(el, {
      scrollMode: "always", // <- don't use "if-needed"
      behavior: "smooth",
      block: "start", // <- aim for top of scroll container
      inline: "nearest",
    });
  }

  function goToRootComment(commentId: number) {
    const rootId = rootById.get(commentId);
    const parentId = parentById.get(commentId) ?? null;
    // Only useful for deeper replies: skip when root is the comment itself
    // or when the root is the direct parent (i.e., second-level replies).
    if (!rootId || rootId === commentId || rootId === parentId) return;
    scrollToComment(rootId);
  }

  function goToParentComment(commentId: number) {
    const parentId = parentById.get(commentId);
    if (!parentId) return;
    scrollToComment(parentId);
  }

  function goToPrevComment(commentId: number) {
    const parentId = parentById.get(commentId) ?? null;

    // Top-level comments: navigate among other top-level comments,
    // ordered by recency (freshest at index 0).
    if (parentId === null) {
      const idx = topLevelIndexById.get(commentId);
      if (idx == null || idx <= 0) return;
      const targetId = topLevelIds[idx - 1];
      if (targetId != null) {
        scrollToComment(targetId);
      }
      return;
    }

    // Replies: navigate within siblings (same parent).
    const siblings = siblingsByParentId.get(parentId) ?? [];
    const siblingIdx = siblingIndexById.get(commentId);
    if (!siblings.length || siblingIdx == null || siblingIdx <= 0) return;
    const targetId = siblings[siblingIdx - 1];
    if (targetId != null) {
      scrollToComment(targetId);
    }
  }

  function goToNextComment(commentId: number) {
    const parentId = parentById.get(commentId) ?? null;

    // Top-level comments: navigate among other top-level comments,
    // ordered by recency (freshest at index 0).
    if (parentId === null) {
      const idx = topLevelIndexById.get(commentId);
      if (
        idx == null ||
        topLevelIds.length === 0 ||
        idx >= topLevelIds.length - 1
      ) {
        return;
      }
      const targetId = topLevelIds[idx + 1];
      if (targetId != null) {
        scrollToComment(targetId);
      }
      return;
    }

    // Replies: navigate within siblings (same parent).
    const siblings = siblingsByParentId.get(parentId) ?? [];
    const siblingIdx = siblingIndexById.get(commentId);
    if (
      !siblings.length ||
      siblingIdx == null ||
      siblingIdx >= siblings.length - 1
    ) {
      return;
    }
    const targetId = siblings[siblingIdx + 1];
    if (targetId != null) {
      scrollToComment(targetId);
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

      const parentId = node.parent_id ?? null;
      const rootId = rootById.get(node.id);
      const isTopLevelComment = parentId === null;

      let canGoPrev = false;
      let canGoNext = false;

      if (isTopLevelComment) {
        const idx = topLevelIndexById.get(node.id);
        if (idx != null) {
          canGoPrev = idx > 0;
          canGoNext = idx < topLevelIds.length - 1;
        }
      } else if (parentId != null) {
        const siblings = siblingsByParentId.get(parentId) ?? [];
        const siblingIdx = siblingIndexById.get(node.id);
        if (siblings.length > 0 && siblingIdx != null) {
          canGoPrev = siblingIdx > 0;
          canGoNext = siblingIdx < siblings.length - 1;
        }
      }

      const showRootButton =
        !isTopLevelComment &&
        !!rootId &&
        rootId !== node.id &&
        rootId !== parentId;

      const showParentButton = !!parentId;

      const currentVote =
        votes[makeVoteKey("comment", node.id)] ?? (0 as VoteValue);

      return (
        <li
          key={node.id}
          id={`comment-${node.id}`}
          className="space-y-1 rounded-md"
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
                <VoteControls
                  targetType="comment"
                  targetId={node.id}
                  score={score}
                  currentVote={currentVote}
                  onVote={(targetType, targetId, direction) =>
                    void applyVote(targetType, targetId, direction)
                  }
                />
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  {showRootButton && (
                    <button
                      type="button"
                      onClick={() => goToRootComment(node.id)}
                      className="text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      root
                    </button>
                  )}
                  {showParentButton && (
                    <button
                      type="button"
                      onClick={() => goToParentComment(node.id)}
                      className="text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      parent
                    </button>
                  )}
                  {isTopLevelComment ? (
                    <>
                      {canGoPrev && (
                        <button
                          type="button"
                          onClick={() => goToPrevComment(node.id)}
                          className="text-zinc-500 hover:underline dark:text-zinc-400"
                        >
                          prev
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => goToNextComment(node.id)}
                        disabled={!canGoNext}
                        className="text-zinc-500 hover:underline disabled:opacity-40 disabled:no-underline dark:text-zinc-400"
                      >
                        next
                      </button>
                    </>
                  ) : (
                    <>
                      {canGoPrev && (
                        <button
                          type="button"
                          onClick={() => goToPrevComment(node.id)}
                          className="text-zinc-500 hover:underline dark:text-zinc-400"
                        >
                          prev
                        </button>
                      )}
                      {canGoNext && (
                        <button
                          type="button"
                          onClick={() => goToNextComment(node.id)}
                          className="text-zinc-500 hover:underline dark:text-zinc-400"
                        >
                          next
                        </button>
                      )}
                    </>
                  )}
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

  const threadCurrentVote =
    votes[makeVoteKey("thread", thread.id)] ?? (0 as VoteValue);

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
            <VoteControls
              targetType="thread"
              targetId={thread.id}
              score={threadScore}
              currentVote={threadCurrentVote}
              onVote={(targetType, targetId, direction) =>
                void applyVote(targetType, targetId, direction)
              }
            />
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

        <CommentComposer
          loading={loading}
          isAuthenticated={!!user}
          commentBody={commentBody}
          isExpanded={isCommentBoxExpanded}
          submitting={commentSubmitting}
          error={replyingTo === null ? commentError : null}
          onChangeBody={setCommentBody}
          onExpand={() => {
            if (!isCommentBoxExpanded) {
              setIsCommentBoxExpanded(true);
            }
          }}
          onCancel={() => {
            setIsCommentBoxExpanded(false);
            setCommentBody("");
            setCommentError(null);
          }}
          onSubmit={handleSubmitComment}
        />

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