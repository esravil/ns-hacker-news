"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";

type ProfileRow = {
  id: string;
  display_name: string | null;
  bio: string | null;
  created_at: string;
};

export default function ProfilePage() {
  const { user, loading, supabase, signOut } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // If not authed, bounce to auth
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  // Load profile for the current user
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError(null);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, bio, created_at")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        if (cancelled) return;

        if (error) {
          console.error("Failed to load profile", error);
          setProfileError("We couldn't load your profile yet.");
          setProfile(null);
        } else {
          setProfile(data ?? null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Unexpected error loading profile", err);
        setProfileError("We couldn't load your profile yet.");
        setProfile(null);
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  // Initialize editable fields from profile when it changes
  useEffect(() => {
    if (!profile) {
      setDisplayName("");
      setBio("");
      return;
    }

    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user && loading) {
    return (
      <section className="flex flex-1 items-center justify-center py-10">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Checking your session…
        </p>
      </section>
    );
  }

  if (!user && !loading) {
    return (
      <section className="flex flex-1 items-center justify-center py-10">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          You need to sign in to view profiles. Redirecting…
        </p>
      </section>
    );
  }

  const derivedDefaultName = user?.id
    ? user.id.split("-")[0]
    : "anonymous";

  const activeDisplayName =
    (displayName && displayName.trim()) ||
    (profile?.display_name && profile.display_name.trim()) ||
    "";

  const headingName =
    activeDisplayName && derivedDefaultName
      ? `${activeDisplayName} · ${derivedDefaultName}`
      : derivedDefaultName;

  const joinedAt =
    profile?.created_at || (user as any)?.created_at || null;

  const formattedJoinedAt =
    joinedAt &&
    new Date(joinedAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const aboutPreview =
    (bio && bio.trim()) ||
    (profile?.bio && profile.bio.trim()) ||
    "This user hasn't written anything about themselves yet.";

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const trimmedDisplayName = displayName.trim();
      const trimmedBio = bio.trim();

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            display_name: trimmedDisplayName || null,
            bio: trimmedBio || null,
          },
          { onConflict: "id" }
        )
        .select("id, display_name, bio, created_at")
        .single<ProfileRow>();

      if (error) {
        console.error("Failed to save profile", error);
        setSaveError("Could not save your profile changes.");
        return;
      }

      setProfile(data);
      setSaveMessage("Profile updated.");
    } catch (err) {
      console.error("Unexpected error saving profile", err);
      setSaveError("Could not save your profile changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user || deleteLoading) return;

    const confirmed = await confirm({
      title: "Delete account?",
      description:
        "This will permanently delete your account and anonymize your posts. This cannot be undone.",
      confirmLabel: "Delete account",
      cancelLabel: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData?.session?.access_token) {
        console.error(
          "Failed to get session for account deletion",
          sessionError
        );
        setDeleteError(
          "We couldn't verify your session. Please refresh the page and try again."
        );
        setDeleteLoading(false);
        return;
      }

      const accessToken = sessionData.session.access_token;

      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        const message =
          payload?.error ||
          "We couldn't delete your account. Please try again.";
        setDeleteError(message);
        setDeleteLoading(false);
        return;
      }

      // Ensure local session is cleared and take the user back home.
      await signOut();
      router.replace("/");
    } catch (err) {
      console.error("Unexpected error deleting account", err);
      setDeleteError("We couldn't delete your account. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <section className="flex flex-1 items-center justify-center py-10">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-zinc-200 bg-white p-6 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <header className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Profile
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {headingName}
          </h1>
          {formattedJoinedAt && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Member since {formattedJoinedAt}
            </p>
          )}
        </header>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="display_name"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Display name
            </label>
            <input
              id="display_name"
              type="text"
              placeholder={derivedDefaultName}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Optional. If left blank, we&apos;ll show{" "}
              <span className="font-mono">{derivedDefaultName}</span>.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="bio"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              About
            </label>
            <textarea
              id="bio"
              rows={4}
              placeholder="Say a few words about yourself, or leave this blank to stay mysterious."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {profileLoading && <p>Loading profile…</p>}
              {profileError && (
                <p className="text-red-600 dark:text-red-400">
                  {profileError}
                </p>
              )}
              {saveError && (
                <p className="text-red-600 dark:text-red-400">{saveError}</p>
              )}
              {saveMessage && (
                <p className="text-emerald-600 dark:text-emerald-400">
                  {saveMessage}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-50 shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        <div className="border-t border-zinc-200 pt-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <p>{aboutPreview}</p>
        </div>

        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide">
                Danger zone
              </p>
              <p className="text-[11px] text-red-700 dark:text-red-200/90">
                Deleting your account will remove your profile and anonymize your
                posts. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={deleteLoading}
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-[11px] font-medium text-red-50 shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-600"
            >
              {deleteLoading ? "Deleting…" : "Delete account"}
            </button>
          </div>
          {deleteError && (
            <p className="mt-2 text-[11px] text-red-800 dark:text-red-200">
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}