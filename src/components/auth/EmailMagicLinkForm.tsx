"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

interface EmailMagicLinkFormProps {
  signupToken?: string | null;
}

export function EmailMagicLinkForm({ signupToken }: EmailMagicLinkFormProps) {
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      if (!email.trim()) {
        throw new Error("Email is required.");
      }

      let redirectPath = "/auth";

      if (signupToken && signupToken.trim()) {
        const trimmed = signupToken.trim();
        const separator = redirectPath.includes("?") ? "&" : "?";
        redirectPath = `${redirectPath}${separator}invite=${encodeURIComponent(
          trimmed
        )}`;
      }

      let redirectTo: string | undefined = undefined;

      if (typeof window !== "undefined") {
        const currentUrl = new URL(window.location.href);
        const invite = currentUrl.searchParams.get("invite");
        const baseAuthUrl = `${window.location.origin}/auth`;

        redirectTo = invite
          ? `${baseAuthUrl}?invite=${encodeURIComponent(invite)}`
          : baseAuthUrl;
      }

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setMessage(
        "Check your email for a magic link. You can use burner / alias emails if you prefer."
      );
    } catch (err: any) {
      console.error("Email magic link error", err);
      setError(err.message ?? "Failed to send magic link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 text-left text-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight">
          Continue with email
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you+anon@proton.me"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting ? "Sending..." : "Send magic link"}
        </button>
      </form>

      {message && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      )}
      {error && (
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}