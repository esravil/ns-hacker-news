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

  // Ensure a profiles row exists for the signed-in user.
  // This keeps foreign keys (author_id, user_id, etc.) happy even if the user
  // never visits /profile explicitly.
  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function ensureProfileRow() {
      try {
        const { error } = await supabase
          .from("profiles")
          .upsert(
            { id: user.id },
            { onConflict: "id" }
          );

        if (error && !cancelled) {
          console.error("Failed to ensure profile row for user", error);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Unexpected error ensuring profile row", err);
        }
      }
    }

    void ensureProfileRow();

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