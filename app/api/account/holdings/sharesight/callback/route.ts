import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  computeExpiresAt,
  exchangeCodeForToken,
  getSharesightConfig,
} from "@/lib/sharesight/oauth";
import { encryptToken } from "@/lib/sharesight/token-crypto";
import { SHARESIGHT_PROVIDER } from "@/lib/sharesight/sync";

const log = logger("api:account:holdings:sharesight:callback");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "sharesight_oauth_state";

/**
 * GET /api/account/holdings/sharesight/callback?code=...&state=...
 *
 * OAuth callback. Verifies the `state` parameter against the HttpOnly
 * cookie set by `/connect` (timing-safe equality), exchanges the code for
 * tokens, encrypts them, and upserts the `investor_oauth_connections` row
 * for this user+provider pair. Finally redirects back to /account/holdings
 * with a `?sharesight=connected` flag so the UI can flash a success
 * message.
 *
 * Failure modes (all log + redirect with ?sharesight=error&reason=...):
 *   - missing code / state
 *   - state mismatch (CSRF)
 *   - token exchange failed
 *   - unconfigured integration
 *   - DB upsert failure
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    log.info("sharesight returned oauth error", {
      userId: user.id,
      error: errorParam,
    });
    return redirectBack("error", `provider_${errorParam}`);
  }
  if (!code || !state) {
    return redirectBack("error", "missing_code_or_state");
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!expectedState) {
    return redirectBack("error", "missing_state_cookie");
  }
  if (!timingSafeEqualStrings(expectedState, state)) {
    log.warn("sharesight oauth state mismatch", { userId: user.id });
    return redirectBack("error", "state_mismatch");
  }

  const config = getSharesightConfig();
  if (!config) {
    return redirectBack("error", "not_configured");
  }

  try {
    const token = await exchangeCodeForToken(config, code);
    const accessEnc = encryptToken(token.access_token);
    const refreshEnc = token.refresh_token
      ? encryptToken(token.refresh_token)
      : null;
    const expiresAt = computeExpiresAt(token.expires_in);

    const { error: upsertError } = await supabase
      .from("investor_oauth_connections")
      .upsert(
        {
          auth_user_id: user.id,
          provider: SHARESIGHT_PROVIDER,
          access_token_enc: accessEnc,
          refresh_token_enc: refreshEnc,
          expires_at: expiresAt,
          scope: token.scope,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sync_error: null,
        },
        { onConflict: "auth_user_id,provider" },
      );

    if (upsertError) {
      log.warn("sharesight oauth upsert failed", {
        userId: user.id,
        error: upsertError.message,
      });
      return redirectBack("error", "db_upsert_failed");
    }

    log.info("sharesight oauth connected", { userId: user.id });
    return redirectBack("connected", null);
  } catch (err) {
    log.warn("sharesight oauth callback failed", {
      userId: user.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return redirectBack("error", "token_exchange_failed");
  }
}

function redirectBack(
  status: "connected" | "error",
  reason: string | null,
): NextResponse {
  const params = new URLSearchParams({ sharesight: status });
  if (reason) params.set("reason", reason);
  return NextResponse.redirect(
    new URL(`/account/holdings?${params.toString()}`, getSiteOrigin()),
    { status: 302 },
  );
}

function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://invest.com.au"
  );
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
