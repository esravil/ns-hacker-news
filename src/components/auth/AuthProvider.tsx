"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { loadInviteToken, clearInviteToken } from "@/lib/inviteToken";

type AuthContextValue = {
  supabase: SupabaseClient;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider wires Supabase Auth into React context on the client.
 *
 * - Creates a browser Supabase client instance.
 * - Hydrates initial user from the current session.
 * - Subscribes to auth state changes.
 * - Ensures a corresponding profiles row exists for each signed-in user.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate initial user and subscribe to auth changes
  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("Error getting current user", error);
        }
        setUser(data?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error getting current user", err);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Ensure that only invited users can stay signed in, then create a profiles row.
  // Flow:
  // - If there is a pending invite token (?invite=... or stored), try to consume it.
  // - Otherwise, verify the user has at least one signup_tokens.used_by = auth.uid().
  // - If gating fails, immediately sign the user out.
  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function gateAndEnsureProfileRow() {
      try {
        const inviteToken = loadInviteToken();

        if (inviteToken) {
          const { error: consumeError } = await supabase.rpc(
            "consume_signup_token",
            {
              p_token: inviteToken,
              p_user_id: user.id,
            }
          );

          if (cancelled) return;

          if (consumeError) {
            console.error(
              "Failed to consume signup token for user",
              consumeError
            );
            await supabase.auth.signOut();
            setUser(null);
            setInviteToken(null);
            return;
          }

          setInviteToken(null);
        } else {
          const { data, error: lookupError } = await supabase
            .from("signup_tokens")
            .select("id")
            .eq("used_by", user.id)
            .maybeSingle();

          if (cancelled) return;

          if (lookupError) {
            console.error(
              "Failed to verify signup token usage for user",
              lookupError
            );
            await supabase.auth.signOut();
            setUser(null);
            return;
          }

          if (!data) {
            await supabase.auth.signOut();
            setUser(null);
            return;
          }
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            { id: user.id },
            { onConflict: "id" }
          );

        if (cancelled) return;

        if (profileError) {
          console.error("Failed to ensure profile row for user", profileError);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Unexpected error ensuring profile row", err);
          supabase.auth
            .signOut()
            .then(() => {
              setUser(null);
            })
            .catch((signOutError) => {
              console.error("Error signing out after failure", signOutError);
            });
        }
      }
    }

    void gateAndEnsureProfileRow();

    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id]);

  const value: AuthContextValue = {
    supabase,
    user,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}