import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabaseClient";
import ThreadsClient from "./threads/ThreadsClient";

type ThreadRow = {
  id: number;
  title: string;
  body: string | null;
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

export const revalidate = 10;

/**
 * Home page
 *
 * Combines:
 * - The nsreddit (dev) hero + description
 * - A "Current status" card describing the MVP
 * - The threads listing (same data as /threads) with interactive voting
 */
export default async function HomePage() {
  const supabase = createSupabaseClient();

  let threads: ThreadRow[] = [];
  let loadError: string | null = null;

  const { data, error } = await supabase.rpc("get_threads_with_meta");

  if (error) {
    console.error("Failed to load threads", error);
    loadError = "Failed to load threads. Check Supabase configuration.";
  } else {
    const rows = (data ?? []) as any[];

    threads = rows.map((row) => {
      return {
        id: row.id as number,
        title: row.title as string,
        body: (row.body as string | null) ?? null,
        created_at: row.created_at as string,
        author_id: (row.author_id as string | null) ?? null,
        author_display_name:
          (row.author_display_name as string | null) ?? null,
        score: (row.score as number | null) ?? 0,
        comment_count: (row.comment_count as number | null) ?? 0,
        url: (row.url as string | null) ?? null,
        url_domain: (row.url_domain as string | null) ?? null,
        media_url: (row.media_url as string | null) ?? null,
        media_mime_type: (row.media_mime_type as string | null) ?? null,
      };
    });
  }

  return (
    <section className="space-y-8">
      {/* Hero */}
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          nsreddit (dev)
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Anonymous, members-only discussion space for the Network State
          community. You&apos;re looking at the early MVP — auth, posting, and
          basic voting are live; moderation and richer features will come next.
        </p>
      </div>

      {/* Current status card */}
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-200">
        <p className="mb-1 font-medium">Current status</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Supabase auth (Solana wallet + email magic link) and profiles are
            wired up, with row-level security enforced in Postgres.
          </li>
          <li>
            The app is invite-only: signup is gated by Supabase RPCs around{" "}
            <span className="font-mono text-[11px]">signup_tokens</span>, with
            support for QR-batch invites and legacy one-time links. After
            sign-in, the backend enforces{" "}
            <span className="font-mono text-[11px]">
              enforce_invite_for_user
            </span>{" "}
            before letting a session stick.
          </li>
          <li>
            Threads and comments can be created, replied to, and soft-deleted by
            their authors. Threads support optional external URLs (with domain
            badges) and image attachments uploaded via the{" "}
            <span className="font-mono text-[11px]">/api/upload</span> route and
            rendered inline on thread pages and in the listing.
          </li>
          <li>
            Upvotes and downvotes are stored per user in the{" "}
            <span className="font-mono text-[11px]">votes</span> table and
            aggregated per thread and comment, with interactive voting in the
            client.
          </li>
          <li>
            Basic moderation tools exist: admins (from{" "}
            <span className="font-mono text-[11px]">profiles.is_admin</span>)
            get a{" "}
            <span className="font-mono text-[11px]">/mod</span> dashboard to
            soft-remove threads and comments via protected API routes.
          </li>
          <li>
            Profiles expose optional display names and a short about section for
            anonymous identities, with public views at{" "}
            <span className="font-mono text-[11px]">/u/:id</span>, a private
            editor at{" "}
            <span className="font-mono text-[11px]">/profile</span>, and an
            account deletion flow that anonymizes content before sign-out.
          </li>
        </ul>
      </div>

      {/* Threads listing (same data as /threads) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Latest threads
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Public, anonymous discussions from the Network State community.
            </p>
          </div>
          <Link
            href="/new"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            + New thread
          </Link>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* Left column: threads */}
          <div className="flex-1 space-y-3">
            {loadError && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {loadError}
              </div>
            )}

            {!loadError && (
              <ThreadsClient initialThreads={threads} showBodyPreview />
            )}
          </div>

          {/* Right column: sidebar container with buttons */}
          <aside className="w-full md:w-64 lg:w-72">
            <div className="space-y-2">
              <button
                type="button"
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Calendar
              </button>
              <Link
                href="/links"
                className="block w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Links
              </Link>
              <button
                type="button"
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Leaderboard
              </button>
              <button
                type="button"
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Cohorts
              </button>
              <button
                type="button"
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Groups
              </button>
              <button
                type="button"
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                News
              </button>
            </div>
          </aside>
        </div>
      </section>
    </section>
  );
}
