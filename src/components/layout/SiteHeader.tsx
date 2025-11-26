"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const isAuthed = !!user;

  async function handleSessionButtonClick() {
    if (loading) return;

    if (isAuthed) {
      await signOut();
    } else {
      router.push("/auth");
    }
  }

  const buttonClasses = [
    "inline-flex",
    "items-center",
    "gap-2",
    "rounded-full",
    "px-3",
    "py-1.5",
    "text-[11px]",
    "font-medium",
    "shadow-sm",
    "transition",
    "border",
    isAuthed
      ? "border-emerald-500/70 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70 dark:border-emerald-400/70 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/60"
      : "border-red-400/70 bg-red-50 text-red-700 hover:bg-red-100/70 dark:border-red-500/70 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-900/70",
  ].join(" ");

  const statusDotClasses = [
    "h-2",
    "w-2",
    "rounded-full",
    "shadow-[0_0_0_3px_rgba(0,0,0,0.08)]",
    isAuthed
      ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]"
      : "bg-red-500 shadow-[0_0_0_3px_rgba(248,113,113,0.35)]",
  ].join(" ");

  const label = loading ? "Checking…" : isAuthed ? "CONNECTED" : "DISCONNECTED";
  const shortId = user ? `${user.id.slice(0, 6)}…` : null;

  return (
    <header className="border-b border-zinc-200 bg-background/80 backdrop-blur dark:border-zinc-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            nsreddit <span className="text-xs opacity-60">dev</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <Link
              href="/new"
              className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              New
            </Link>
            {isAuthed && (
              <Link
                href="/profile"
                className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Profile
              </Link>
            )}
          </nav>

          <button
            type="button"
            onClick={() => void handleSessionButtonClick()}
            className={buttonClasses}
            aria-label={isAuthed ? "Sign out" : "Sign in"}
          >
            <span className={statusDotClasses} />
            <span>{label}</span>
            {isAuthed && shortId && (
              <span className="hidden font-mono text-[10px] text-emerald-700 dark:text-emerald-200 sm:inline">
                {shortId}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}