import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import WholesaleCertClient from "./WholesaleCertClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wholesale Investor Certification — My Account",
  description: "Submit your s708 or professional investor certification to access wholesale-gated listings.",
  robots: "noindex, nofollow",
};

export default async function WholesaleCertPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch the most-recently-submitted cert (any status) so the UI can show current state
  const { data: cert } = await supabase
    .from("wholesale_investor_certifications")
    .select("id, certification_type, status, expires_at, verified_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <nav className="text-xs text-slate-500 mb-6">
        <Link href="/account/dashboard" className="hover:text-violet-600">Dashboard</Link>
        <span className="mx-1.5">/</span>
        <span>Wholesale Certification</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Wholesale Investor Certification</h1>
        <p className="text-sm text-slate-500 mt-1">
          A platform-level certification recognised across all wholesale-gated opportunities —
          startup data rooms, pre-IPO tranches, and private market assets.
          Certify once; no per-listing re-attestation required.
        </p>
      </header>

      <WholesaleCertClient existing={cert} />
    </main>
  );
}
