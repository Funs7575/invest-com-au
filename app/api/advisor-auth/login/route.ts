import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/url";

/**
 * POST /api/advisor-auth/login
 * 
 * Advisor login using Supabase Auth.
 * Supports: magic link (OTP), password login, or signup.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, mode = "magic" } = body;
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const trimmed = email.toLowerCase().trim();

    if (await isRateLimited(`advisor_login:${trimmed}`, 5, 60)) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();
    const siteUrl = getSiteUrl(request.headers.get("host"));

    // Check if this email is a registered advisor
    const { data: advisor } = await admin
      .from("professionals")
      .select("id, name, email, status, auth_user_id")
      .eq("email", trimmed)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (!advisor) {
      if (mode === "magic") return NextResponse.json({ success: true, message: "If your email is registered, you'll receive a login link." });
      return NextResponse.json({ error: "No advisor account found. Apply at /for-advisors to get started." }, { status: 404 });
    }

    if (mode === "magic") {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/advisor-portal`,
          shouldCreateUser: true,
        },
      });

      if (otpError) {
        console.error("Advisor OTP error:", otpError.message);
        return NextResponse.json({ error: "Failed to send login link. Please try again." }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Check your email for a login link." });
    }

    if (mode === "password") {
      if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (authError) {
        return NextResponse.json({ error: authError.message === "Invalid login credentials" ? "Wrong email or password." : authError.message }, { status: 401 });
      }

      // Link auth user to professional if not linked
      if (authData.user) {
        await admin.from("professionals").update({
          auth_user_id: authData.user.id,
          last_login_at: new Date().toISOString(),
        }).eq("id", advisor.id);
      }

      return NextResponse.json({ success: true, advisor: { id: advisor.id, name: advisor.name } });
    }

    if (mode === "signup") {
      if (!password || password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }

      if (advisor.auth_user_id) {
        return NextResponse.json({ error: "Account already exists. Use login instead." }, { status: 409 });
      }

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/advisor-portal`,
          data: { advisor_id: advisor.id, name: advisor.name },
        },
      });

      if (signupError) {
        if (signupError.message.includes("already registered")) {
          return NextResponse.json({ error: "Email already registered. Try logging in or use magic link." }, { status: 409 });
        }
        return NextResponse.json({ error: signupError.message }, { status: 400 });
      }

      if (signupData.user) {
        await admin.from("professionals").update({
          auth_user_id: signupData.user.id,
          last_login_at: new Date().toISOString(),
          login_count: 1,
        }).eq("id", advisor.id);
      }

      return NextResponse.json({
        success: true,
        message: signupData.session ? "Account created! You're logged in." : "Check your email to confirm your account.",
        needsConfirmation: !signupData.session,
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    console.error("Advisor auth error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
