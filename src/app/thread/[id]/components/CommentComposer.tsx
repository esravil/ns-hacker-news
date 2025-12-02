"use client";

import Link from "next/link";
import type { FormEvent } from "react";

interface CommentComposerProps {
  loading: boolean;
  isAuthenticated: boolean;
  commentBody: string;
  isExpanded: boolean;
  submitting: boolean;
  error: string | null;
  onChangeBody: (value: string) => void;
  onExpand: () => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}

export function CommentComposer({
  loading,
  isAuthenticated,
  commentBody,
  isExpanded,
  submitting,
  error,
  onChangeBody,
  onExpand,
  onCancel,
  onSubmit,
}: CommentComposerProps) {
  if (loading) {
    return (
      <div className="rounded-lg bg-white pt-3 pb-3 text-xs text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
        <p>Checking your session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg bg-white pt-3 pb-3 text-xs text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="font-medium">Want to join the discussion?</span>{" "}
            <span>Sign in with a wallet or email to post comments.</span>
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white pt-3 pb-3 text-xs text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
      <form onSubmit={onSubmit} className="space-y-2">
        <div
          className={[
            "relative rounded-md border bg-white text-xs shadow-sm transition dark:bg-zinc-950",
            isExpanded
              ? "border-zinc-900 ring-1 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
              : "cursor-text border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:bg-zinc-900",
          ].join(" ")}
          onClick={() => {
            if (!isExpanded) {
              onExpand();
            }
          }}
        >
          {isExpanded ? (
            <textarea
              id="new-comment"
              rows={4}
              value={commentBody}
              onChange={(e) => onChangeBody(e.target.value)}
              placeholder="Write a comment…"
              className="block w-full rounded-md border-0 bg-transparent px-1 py-2 text-xs text-zinc-900 outline-none ring-0 placeholder:text-zinc-400 dark:text-zinc-100"
            />
          ) : (
            <div className="px-1 py-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              Write a comment…
            </div>
          )}
        </div>
        {error && (
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
        )}
        {isExpanded && (
          <div className="space-y-2 text-[10px] text-zinc-500 dark:text-zinc-400">
            <p>
              {commentBody.length > 0 ? (
                `${commentBody.length} character${
                  commentBody.length === 1 ? "" : "s"
                }`
              ) : (
                <>
                  If you haven&apos;t already, would you mind reading our{" "}
                  <Link
                    href="/comments-guidelines"
                    className="underline-offset-2 hover:underline"
                  >
                    comment guidelines
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/guidelines"
                    className="underline-offset-2 hover:underline"
                  >
                    site guidelines
                  </Link>
                  ?
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting || !commentBody.trim()}
                className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {submitting ? "Posting…" : "Post"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="text-[10px] text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}