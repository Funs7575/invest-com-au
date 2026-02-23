import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { adjustWallet } from "@/lib/marketplace/wallet";

/**
 * POST /api/marketplace/wallet-adjust
 * Admin-only: manually adjust a broker's wallet balance.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify caller is admin by checking the cookie-based session
    const cookieHeader = request.headers.get("cookie") || "";
    const { createServerClient } = await import("@supabase/ssr");
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieHeader.split(";").map((c) => {
              const [name, ...rest] = c.trim().split("=");
              return { name, value: rest.join("=") };
            });
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { broker_slug, amount_cents, description } = await request.json();

    if (!broker_slug || !amount_cents || !description) {
      return NextResponse.json(
        { error: "broker_slug, amount_cents, and description are required" },
        { status: 400 }
      );
    }

    const txn = await adjustWallet(
      broker_slug,
      amount_cents,
      description,
      user.email || "admin"
    );

    return NextResponse.json({ success: true, transaction: txn });
  } catch (err) {
    console.error("Wallet adjustment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Adjustment failed" },
      { status: 500 }
    );
  }
}
