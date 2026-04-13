import Link from "next/link";
import type { Metadata } from "next";
import Icon from "@/components/Icon";
import ResendMagicLinkForm from "./ResendMagicLinkForm";

export const metadata: Metadata = {
  title: "Sign-in link couldn't be verified",
  robots: { index: false, follow: false },
};

/**
 * User-facing error page reached when /auth/callback can't exchange
 * the token for a session. The query string carries the root cause:
 *   ?reason=<code>&desc=<supabase_message>&next=<redirect_target>
 *
 * Known reasons:
 *   - access_denied / otp_expired: link expired or was consumed by a
 *     mail client's link scanner (Gmail wraps links and sometimes
 *     prefetches them in a security sandbox).
 *   - pkce_failed: the PKCE code_verifier cookie was missing — usually
 *     a cross-device click (requested on desktop, clicked on phone)
 *     or cookies were cleared between request and click.
 *   - otp_failed: server-side token verification failed.
 *   - missing_params: direct hit on the callback with nothing to verify.
 */
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{
    reason?: string;
    desc?: string;
    next?: string;
  }>;
}) {
  const { reason, desc, next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  const { title, explanation } = describeReason(reason);

  return (
    <div className="py-10 md:py-16">
      <div className="container-custom max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8">
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon name="alert-triangle" size={28} className="text-amber-500" />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1">
              {title}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {explanation}
            </p>
          </div>

          {/* Resend form — same-browser, server-verified resend */}
          <ResendMagicLinkForm next={safeNext} />

          <div className="mt-5 pt-5 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Prefer a password? {" "}
              <Link
                href={`/auth/login?next=${encodeURIComponent(safeNext)}`}
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                Sign in with your password
              </Link>
            </p>
            <p className="text-xs text-slate-400">
              Having trouble? {" "}
              <Link
                href="/contact"
                className="text-slate-500 hover:text-slate-700 underline"
              >
                Contact support
              </Link>
            </p>
          </div>

          {/* Technical detail — only show if present, kept small for
              user comprehension but visible enough for support to quote */}
          {desc && (
            <details className="mt-4">
              <summary className="text-[0.65rem] text-slate-400 cursor-pointer select-none hover:text-slate-600">
                Technical details
              </summary>
              <p className="mt-1 px-3 py-2 text-[0.65rem] text-slate-500 bg-slate-50 border border-slate-100 rounded font-mono break-words">
                {desc}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function describeReason(reason: string | undefined): {
  title: string;
  explanation: string;
} {
  switch (reason) {
    case "otp_expired":
    case "access_denied":
      return {
        title: "Your sign-in link expired",
        explanation:
          "Magic links are one-time use and expire quickly. Some email apps (Gmail, Outlook) also scan links automatically and can consume them before you click. Request a fresh link below — it'll arrive in under a minute.",
      };
    case "pkce_failed":
      return {
        title: "This link was opened on a different browser",
        explanation:
          "For security, magic links must be opened in the same browser you requested them from. If you asked for the link on your desktop and clicked from your phone, that's why it didn't work. Request a fresh link below from the browser you'll use to sign in.",
      };
    case "otp_failed":
      return {
        title: "We couldn't verify your sign-in link",
        explanation:
          "The link's token failed verification. This usually means it was already used or expired. Request a fresh one and click it straight away.",
      };
    case "missing_params":
      return {
        title: "No verification token found",
        explanation:
          "This page is reached automatically after clicking a magic link. If you got here by accident, request a new sign-in link below.",
      };
    default:
      return {
        title: "Couldn't sign you in",
        explanation:
          "Something went wrong verifying your sign-in link. Request a fresh one below and click it from the same browser.",
      };
  }
}
