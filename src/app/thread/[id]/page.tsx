import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import ThreadClient from "./ThreadClient";

type ThreadRow = {
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
  is_deleted: boolean;
};

type CommentRow = {
  id: number;
  body: string;
  created_at: string;
  author_id: string | null;
  parent_id: number | null;
  author_display_name: string | null;
  is_deleted: boolean;
};

interface ThreadPageProps {
  params: {
    id: string;
  };
}

export const dynamic = "force-dynamic";

/**
 * Server-side data fetch for a single thread and its comments.
 * Delegates interactive features (commenting, voting, deletion) to ThreadClient.
 */
export default async function ThreadPage(props: ThreadPageProps) {
  const { id } = await props.params;
  const threadId = Number(id);

  if (Number.isNaN(threadId)) {
    notFound();
  }

  const supabase = createSupabaseClient();

  // Load thread with joined author display name
  const {
    data: rawThread,
    error: threadError,
  } = await supabase
    .from("threads")
    .select(
      "id, title, body, created_at, author_id, url, url_domain, media_url, media_mime_type, is_deleted, profiles!threads_author_id_fkey(display_name)"
    )
    .eq("id", threadId)
    .maybeSingle<any>();

  if (!rawThread || threadError) {
    notFound();
  }

  const threadAuthorId = (rawThread.author_id as string | null) ?? null;
  const threadAuthorDisplayName =
    (rawThread.profiles?.display_name as string | null) ?? null;

  const threadFallbackName =
    threadAuthorId && threadAuthorId.length >= 8
      ? `user-${threadAuthorId.slice(0, 8)}`
      : "anonymous";

  const threadDisplayName =
    (threadAuthorDisplayName && threadAuthorDisplayName.trim()) ||
    threadFallbackName;

  const thread: ThreadRow = {
    id: rawThread.id as number,
    title: rawThread.title as string,
    body: rawThread.body as string,
    created_at: rawThread.created_at as string,
    author_id: threadAuthorId,
    author_display_name: threadAuthorDisplayName,
    url: (rawThread.url as string | null) ?? null,
    url_domain: (rawThread.url_domain as string | null) ?? null,
    media_url: (rawThread.media_url as string | null) ?? null,
    media_mime_type: (rawThread.media_mime_type as string | null) ?? null,
    is_deleted: (rawThread.is_deleted as boolean) ?? false,
  };

  // Load comments with joined author display names
  const {
    data: commentsData,
    error: commentsError,
  } = await supabase
    .from("comments")
    .select(
      "id, body, created_at, author_id, parent_id, is_deleted, profiles!comments_author_id_fkey(display_name)"
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (commentsError) {
    // In a simple MVP, treat comment load failure as "no comments" rather than 404.
    console.error("Failed to load comments", commentsError);
  }

  const rawComments = (commentsData ?? []) as any[];

  const comments: CommentRow[] = rawComments.map((row) => {
    const authorId = (row.author_id as string | null) ?? null;
    const authorDisplayName =
      (row.profiles?.display_name as string | null) ?? null;

    const fallbackName =
      authorId && authorId.length >= 8
        ? `user-${authorId.slice(0, 8)}`
        : "anonymous";

    const displayName =
      (authorDisplayName && authorDisplayName.trim()) || fallbackName;

    return {
      id: row.id as number,
      body: row.body as string,
      created_at: row.created_at as string,
      author_id: authorId,
      parent_id: (row.parent_id as number | null) ?? null,
      author_display_name: displayName,
      is_deleted: (row.is_deleted as boolean) ?? false,
    };
  });

  // Aggregate votes for this thread
  const { data: threadVotesData, error: threadVotesError } = await supabase
    .from("votes")
    .select("target_id, value")
    .eq("target_type", "thread")
    .eq("target_id", threadId);

  if (threadVotesError) {
    console.error("Failed to load thread votes", threadVotesError);
  }

  const initialThreadScore = (threadVotesData ?? []).reduce(
    (sum, row: any) => sum + (row.value as number),
    0
  );

  // Aggregate votes for comments
  let initialCommentScores: Record<number, number> = {};

  if (comments.length > 0) {
    const commentIds = comments.map((c) => c.id);
    const {
      data: commentVotesData,
      error: commentVotesError,
    } = await supabase
      .from("votes")
      .select("target_id, value")
      .eq("target_type", "comment")
      .in("target_id", commentIds);

    if (commentVotesError) {
      console.error("Failed to load comment votes", commentVotesError);
    }

    initialCommentScores = (commentVotesData ?? []).reduce(
      (acc: Record<number, number>, row: any) => {
        const targetId = row.target_id as number;
        const value = row.value as number;
        acc[targetId] = (acc[targetId] ?? 0) + value;
        return acc;
      },
      {}
    );
  }

  return (
    <ThreadClient
      thread={thread}
      initialComments={comments}
      initialThreadScore={initialThreadScore}
      initialCommentScores={initialCommentScores}
    />
  );
}