"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailMagicLinkForm } from "@/components/auth/EmailMagicLinkForm";
import { Web3SignInPanel } from "@/components/auth/Web3SignInPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadInviteToken } from "@/lib/inviteToken";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [signupToken, setSignupToken] = useState<string | null>(null);

  useEffect(() => {
    const token = loadInviteToken();
    setSignupToken(token);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (!loading && user) {
    return (
      <section className="flex flex-1 items-center justify-center py-10">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          You&apos;re signed in. Taking you back to the main page…
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col items-center justify-center py-10">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Access is invite-only. Scan today&apos;s QR at the venue or use a
            one-time invite link sent by the organizers.
          </p>
        </header>

        <div className="space-y-4">
          <Web3SignInPanel />

          <div className="flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span>or</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <EmailMagicLinkForm signupToken={signupToken} />
        </div>
      </div>

    </section>
  );
}