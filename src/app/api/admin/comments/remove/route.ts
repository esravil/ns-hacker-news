import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      "[admin comments remove] Missing Supabase env vars. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
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

  let commentId: number | null = null;
  let reason: string | null = null;

  try {
    const body = (await request.json()) as {
      commentId?: number;
      reason?: string;
      note?: string | null;
    };

    commentId =
      typeof body.commentId === "number"
        ? body.commentId
        : Number(body.commentId);
    reason =
      typeof body.reason === "string" && body.reason.trim().length > 0
        ? body.reason.trim()
        : null;

    if (!commentId || Number.isNaN(commentId)) {
      return NextResponse.json(
        { error: "commentId is required and must be a number." },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[admin comments remove] Failed to parse JSON body", err);
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  try {
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
        "[admin comments remove] Failed to get user from access token",
        getUserError
      );
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const { error: gateError } = await supabaseUser.rpc(
      "enforce_admin_for_user"
    );

    if (gateError) {
      console.error(
        "[admin comments remove] Admin gate failed for user",
        gateError
      );
      return NextResponse.json(
        { error: "You are not allowed to perform this action." },
        { status: 403 }
      );
    }

    const { error: rpcError } = await supabaseUser.rpc(
      "admin_soft_delete_comment",
      {
        p_comment_id: commentId,
        p_reason: reason,
      }
    );

    if (rpcError) {
      console.error("[admin comments remove] RPC failed", rpcError);
      return NextResponse.json(
        { error: "Failed to remove comment." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin comments remove] Unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error while removing comment." },
      { status: 500 }
    );
  }
}