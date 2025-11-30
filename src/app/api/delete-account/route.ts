import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * DELETE ACCOUNT
 *
 * This route:
 * - Receives a Supabase access token via the Authorization: Bearer <token> header.
 * - Uses an anon client bound to that token to resolve the current user.
 * - Uses a service-role client to call auth.admin.deleteUser(user.id).
 *
 * Your database schema handles:
 * - Cascade delete of public.profiles (on delete cascade).
 * - Nulling of author_id on threads/comments (on delete set null).
 * - Cascade delete of votes, etc.
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    console.error(
      "[delete-account] Missing Supabase env vars. Expected NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY."
    );
    return NextResponse.json(
      { error: "Server is not configured correctly." },
      { status: 500 }
    );
  }

  const authHeader =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing Authorization header." },
      { status: 401 }
    );
  }

  const [scheme, token] = authHeader.split(" ");

  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return NextResponse.json(
      { error: "Invalid Authorization header format." },
      { status: 401 }
    );
  }

  const accessToken = token.trim();

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing access token." },
      { status: 401 }
    );
  }

  try {
    // 1) Resolve current user from the provided access token using an anon client
    const supabaseUser = createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: userData,
      error: getUserError,
    } = await supabaseUser.auth.getUser();

    if (getUserError || !userData?.user) {
      console.error(
        "[delete-account] Failed to get user from access token",
        getUserError
      );
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // 2) Use service-role client to delete the auth user.
    //    Database FKs take care of profiles, votes, and anonymizing content.
    const supabaseAdmin = createClient(url, serviceKey);

    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("[delete-account] Failed to delete user", deleteError);
      return NextResponse.json(
        { error: "Failed to delete account." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delete-account] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error while deleting account." },
      { status: 500 }
    );
  }
}