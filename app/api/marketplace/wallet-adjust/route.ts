import { isRateLimited } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";
import { adjustWallet } from "@/lib/marketplace/wallet";
import { logger } from "@/lib/logger";

const log = logger("wallet");

/**
 * POST /api/marketplace/wallet-adjust
 * Admin-only: manually adjust a broker's wallet balance.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`wallet-adjust:${ip}`, 10, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const supabase = createAdminClient();

    // Verify caller is admin by checking the cookie-based session
    const cookieHeader = request.headers.get("cookie") || "";
    const { createServerClient } = await import("@supabase/ssr");
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
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

    // Check if user is admin via ADMIN_EMAILS allowlist (not profile role)
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
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
    log.error("Wallet adjustment error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Adjustment failed" },
      { status: 500 }
    );
  }
}
