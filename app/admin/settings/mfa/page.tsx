import AdminShell from "@/components/AdminShell";
import Link from "next/link";
import MfaEnrollmentClient from "./MfaEnrollmentClient";
import { isAdminMfaEnrolled } from "@/lib/admin-mfa";
import { requireAdmin } from "@/lib/require-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Admin MFA enrollment / management page.
 *
 * Shows:
 *   - Current enrollment status
 *   - Enroll flow (QR code + recovery codes, one shot)
 *   - Disable with reason
 *
 * Secrets only exist in memory briefly during the enroll dance.
 * Once the page navigates away the plaintext secret is gone and
 * the stored copy stays encrypted.
 */
export default async function AdminMfaPage() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    // Non-admins go home rather than being shown the page
    redirect("/admin/login");
  }

  const enrolled = await isAdminMfaEnrolled(guard.email);

  return (
    <AdminShell
      title="Two-factor authentication"
      subtitle="Protect your admin account with a TOTP authenticator"
    >
      <div className="p-4 md:p-6 max-w-2xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin" className="hover:text-slate-900">
            ← Admin home
          </Link>
        </nav>

        <div
          className={`rounded-xl border p-5 mb-5 ${
            enrolled
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                enrolled ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
              }`}
              aria-hidden="true"
            >
              {enrolled ? "✓" : "!"}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {enrolled ? "MFA is enabled" : "MFA is not enabled"}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {enrolled
                  ? `Account: ${guard.email}`
                  : "Your admin account is protected by password only. Enable MFA below."}
              </p>
            </div>
          </div>
        </div>

        <MfaEnrollmentClient enrolled={enrolled} email={guard.email} />

        <div className="mt-8 text-xs text-slate-500 leading-relaxed">
          <p className="mb-2">
            <strong>Why MFA?</strong> A password alone can be
            phished, shared, or guessed. TOTP codes rotate every 30
            seconds and live only on your device — an attacker
            who gets your password still can&apos;t log in.
          </p>
          <p>
            <strong>Recommended apps</strong> — 1Password, Bitwarden,
            Authy, Google Authenticator, Microsoft Authenticator.
            Any RFC 6238 app will work.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
