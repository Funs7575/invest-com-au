import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth-verify");

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const supabase = await createClient();

    // Find valid token
    const { data: authToken } = await supabase
      .from("advisor_auth_tokens")
      .select("id, professional_id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (!authToken) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }

    if (authToken.used_at) {
      return NextResponse.json({ error: "This link has already been used" }, { status: 401 });
    }

    if (new Date(authToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "This link has expired. Please request a new one." }, { status: 401 });
    }

    // Mark token as used
    await supabase.from("advisor_auth_tokens").update({ used_at: new Date().toISOString() }).eq("id", authToken.id);

    // Create session (valid 30 days)
    const sessionToken = randomBytes(32).toString("hex");
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("advisor_sessions").insert({
      professional_id: authToken.professional_id,
      session_token: sessionToken,
      expires_at: sessionExpires,
    });

    // Get advisor info
    const { data: advisor } = await supabase
      .from("professionals")
      .select("id, name, slug, firm_name, email, photo_url")
      .eq("id", authToken.professional_id)
      .single();

    // Set session cookie
    const response = NextResponse.json({ success: true, advisor });
    response.cookies.set("advisor_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    log.error("Token verify error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
