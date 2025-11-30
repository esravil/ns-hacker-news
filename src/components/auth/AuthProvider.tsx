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
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext(undefined as AuthContextValue | undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider wires Supabase Auth into React context on the client.
 *
 * - Creates a browser Supabase client instance.
 * - Hydrates initial user from the current session.
 * - Subscribes to auth state changes.
 * - Ensures a corresponding profiles row exists for each signed-in user and
 *   keeps an isAdmin flag in sync with public.profiles.is_admin.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const supabase: SupabaseClient = useMemo(() => createSupabaseClient(), []);
  const [user, setUser] = useState(null as User | null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Enforce invite gate + ensure profile row + sync isAdmin from profiles.is_admin.
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;

    async function gateAndEnsureProfileRow() {
      try {
        const inviteToken = loadInviteToken();

        const { error: gateError } = await supabase.rpc(
          "enforce_invite_for_user",
          {
            p_invite_token: inviteToken,
          }
        );

        if (cancelled) return;

        if (gateError) {
          console.error("Invite enforcement failed; signing out.", gateError);
          clearInviteToken();
          await supabase.auth.signOut();
          setUser(null);
          setIsAdmin(false);
          return;
        }

        clearInviteToken();

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: user.id }, { onConflict: "id" })
          .select("id, is_admin")
          .single();

        if (cancelled) return;

        if (profileError) {
          console.error("Failed to ensure profile row for user", profileError);
          setIsAdmin(false);
        } else {
          setIsAdmin(profileRow?.is_admin === true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Unexpected error enforcing invite gate", err);
          clearInviteToken();
          supabase.auth
            .signOut()
            .then(() => {
              setUser(null);
              setIsAdmin(false);
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
    isAdmin,
    signOut: async () => {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
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