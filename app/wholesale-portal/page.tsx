import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wholesale operator portal — Invest.com.au",
  robots: { index: false, follow: false },
};

const FUND_TYPE_LABELS: Record<string, string> = {
  private_equity: "Private equity",
  venture_capital: "Venture capital",
  real_estate: "Real estate",
  private_credit: "Private credit",
  litigation_funding: "Litigation funding",
  insurance_linked: "Insurance-linked",
  hedge: "Hedge",
  other: "Other",
};

export default async function WholesalePortalHome() {
  // Layout already enforced the kind gate; this read is the operator's
  // own row via RLS.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: op } = await supabase
    .from("wholesale_operators")
    .select("display_name, afsl_number, fund_type, s708_verified_at, status")
    .eq("auth_user_id", user?.id ?? "")
    .maybeSingle();

  const verified = Boolean(op?.s708_verified_at);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        {op?.display_name || "Wholesale operator"}
      </h1>
      <p className="text-sm text-slate-500 mb-8">s708-qualified fund manager portal</p>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">AFSL</p>
          <p className="text-sm font-semibold text-slate-900">
            {op?.afsl_number || "Not on file"}
          </p>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Fund type</p>
          <p className="text-sm font-semibold text-slate-900">
            {op?.fund_type ? FUND_TYPE_LABELS[op.fund_type] ?? op.fund_type : "Not set"}
          </p>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Account status</p>
          <p className="text-sm font-semibold capitalize text-slate-900">
            {op?.status ?? "pending"}
          </p>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
            s708 verification
          </p>
          <p
            className={`text-sm font-semibold ${
              verified ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {verified ? "Verified" : "Pending verification"}
          </p>
        </div>
      </div>

      {!verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          <strong>Verification required.</strong> Listings can only be published
          to sophisticated / wholesale (s708) investors once your status is
          verified. The partnerships team will be in touch.
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Your listings</h2>
        <p className="text-sm text-slate-500">
          Listing management ships here. Reach out to the partnerships team to
          publish your first wholesale offering.
        </p>
      </section>
    </main>
  );
}
