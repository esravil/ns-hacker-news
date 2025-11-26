import { createSupabaseClient } from "@/lib/supabaseClient";

type PublicProfileRow = {
  id: string;
  display_name: string | null;
  bio: string | null;
  created_at: string | null;
};

interface PublicProfilePageProps {
  params: {
    id: string;
  };
}

export const dynamic = "force-dynamic";

/**
 * Public-facing profile page.
 * Accessible at /u/:id and readable by anyone.
 *
 * If a profiles row doesn't exist yet for this user id, we still render a
 * placeholder instead of returning 404. This avoids broken links for older
 * content created before profiles were guaranteed.
 */
export default async function PublicProfilePage(props: PublicProfilePageProps) {
  const { id } = await props.params;

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, bio, created_at")
    .eq("id", id)
    .maybeSingle<PublicProfileRow>();

  if (error) {
    console.error("Failed to load public profile", error);
  }

  const hasRealProfile = !!data;

  const profile: PublicProfileRow = data ?? {
    id,
    display_name: null,
    bio: null,
    created_at: null,
  };

  const displayName =
    (profile.display_name && profile.display_name.trim()) ||
    (profile.id ? `user-${profile.id.slice(0, 8)}` : "anonymous");

  const joinedAt = profile.created_at;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {displayName}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Public profile for an anonymous nsreddit member.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-3 text-xs text-zinc-700 dark:text-zinc-200">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">
              User id:{" "}
            </span>
            <span className="font-mono break-all text-[11px]">
              {profile.id}
            </span>
          </div>
          {joinedAt && (
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">
                Member since:{" "}
              </span>
              <span>
                {new Date(joinedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          {!hasRealProfile && (
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">
                Profile status:{" "}
              </span>
              <span>
                This member hasn&apos;t created a profile yet. You&apos;re
                seeing an auto-generated placeholder based on their internal id.
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-zinc-200 pt-4 text-xs dark:border-zinc-800">
          <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            About
          </h2>
          {profile.bio && profile.bio.trim().length > 0 ? (
            <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
              {profile.bio}
            </p>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">
              This user hasn&apos;t added an about section yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}