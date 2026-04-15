import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIERS, type AdvisorTier } from "@/lib/advisor-tiers";
import UpgradeClient from "./UpgradeClient";

export const dynamic = "force-dynamic";

/**
 * Advisor self-service tier upgrade page.
 *
 * Shows:
 *   - Current plan
 *   - All tiers with pricing + features
 *   - Billing toggle (monthly / annual with ~20% discount)
 *   - Upgrade button that hits /api/advisor-auth/tier-upgrade
 *     → Stripe Checkout → success page
 *
 * Reads the advisor session cookie on the server so the client
 * gets the current tier without an extra fetch.
 */
async function getCurrentAdvisor() {
  const sessionToken = (await cookies()).get("advisor_session")?.value;
  if (!sessionToken) return null;
  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("token", sessionToken)
    .maybeSingle();
  if (
    !session ||
    !session.professional_id ||
    (session.expires_at && new Date(session.expires_at as string).getTime() < Date.now())
  ) {
    return null;
  }
  const { data: advisor } = await supabase
    .from("professionals")
    .select("id, name, email, advisor_tier")
    .eq("id", session.professional_id)
    .maybeSingle();
  return advisor;
}

export default async function AdvisorUpgradePage() {
  const advisor = await getCurrentAdvisor();
  if (!advisor) {
    redirect("/advisor-portal/login?redirect=/advisor-portal/upgrade");
  }

  const currentTier = ((advisor.advisor_tier as AdvisorTier) || "free") as AdvisorTier;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <nav className="text-xs text-slate-500 mb-3">
        <Link href="/advisor-portal" className="hover:text-slate-900">
          ← Advisor portal
        </Link>
      </nav>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        Choose your plan
      </h1>
      <p className="text-sm text-slate-600 mb-6 max-w-2xl">
        Higher tiers rank you more prominently, give you a cheaper
        per-lead cost, and unlock dedicated dispute handling. You
        can change tiers any time.
      </p>

      <UpgradeClient currentTier={currentTier} tiers={TIERS} />

      <div className="mt-10 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
        <p className="mb-2">
          <strong className="text-slate-800">How billing works:</strong>{" "}
          Monthly plans renew every 30 days; annual plans renew
          every 365 days. Changing tiers mid-cycle is prorated
          automatically via Stripe.
        </p>
        <p>
          <strong className="text-slate-800">Tax invoices:</strong>{" "}
          GST-compliant tax invoices are available from your
          billing history at{" "}
          <Link href="/advisor-portal/billing" className="underline hover:text-slate-900">
            /advisor-portal/billing
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
