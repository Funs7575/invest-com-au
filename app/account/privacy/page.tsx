import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrivacyClient from "./PrivacyClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy & data — My Account",
  robots: { index: false, follow: false },
};

/**
 * /account/privacy — authenticated user data rights settings.
 *
 * Surfaces the right to access (data export) and right to erasure
 * (account deletion) for the signed-in user. These map to the
 * authenticated endpoints under /api/account/* — no email
 * verification needed because the user is already logged in.
 *
 * Anonymous users (lead submissions, quiz responses without an
 * account) can use the email-verified flow at /privacy/data-rights
 * — linked from this page.
 *
 * Compliance: APP 12 (right to access), APP 11 (right to erasure),
 * GDPR Article 15 (access), GDPR Article 17 (erasure).
 */
export default async function AccountPrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/account/privacy");
  }

  // Read the most recent export and deletion request so the UI can
  // show their state (pending / cancellable). We use the user-scoped
  // RLS policies on these tables — the SSR client respects them.
  const [exportRes, deletionRes] = await Promise.all([
    supabase
      .from("data_export_requests")
      .select("id, status, requested_at, fulfilled_at, expires_at, download_url")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("account_deletion_requests")
      .select("id, status, requested_at, scheduled_purge_at, cancelled_at")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="py-6 md:py-10">
      <div className="container-custom max-w-3xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/account" className="hover:text-slate-900">
            ← My account
          </Link>
        </nav>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Privacy & data
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-8 max-w-2xl">
          Under the Australian Privacy Act 1988 (Australian Privacy
          Principles 11 and 12) and GDPR (Articles 15 and 17), you can
          download a copy of every piece of personal data we hold for
          your account, or request permanent deletion. Both actions
          take effect on this signed-in account — no email verification
          needed.
        </p>

        <PrivacyClient
          email={user.email ?? ""}
          latestExport={exportRes.data ?? null}
          latestDeletion={deletionRes.data ?? null}
        />

        <div className="mt-10 bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 leading-relaxed">
          <h2 className="font-bold text-slate-800 text-sm mb-2">
            Don&apos;t have an account?
          </h2>
          <p className="mb-3">
            If you submitted a quiz, enquiry, or review without creating
            an account, you can still request your data via the
            email-verified flow below. We&apos;ll send a one-time link
            to your address that you click to confirm the request.
          </p>
          <Link
            href="/privacy/data-rights"
            className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold"
          >
            Email-verified data rights flow →
          </Link>
        </div>
      </div>
    </div>
  );
}
