import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import VerifiedClient, { type VerifiedRow } from "./VerifiedClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verified Products — My Account",
  robots: "noindex, nofollow",
};

export default async function VerifiedProductsPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?next=/account/verified");
  }

  const { data } = await supabase
    .from("product_user_verified")
    .select("id, product_type, product_ref, verified_at")
    .eq("user_id", user.id)
    .order("verified_at", { ascending: false });

  const initialRows: VerifiedRow[] = (data ?? []).map((r) => ({
    id: r.id as number,
    product_type: r.product_type as VerifiedRow["product_type"],
    product_ref: r.product_ref,
    verified_at: r.verified_at,
  }));

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/account" className="hover:text-violet-600">
            Account
          </Link>
          <span aria-hidden>›</span>
          <span className="text-slate-700">Verified products</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Products I Use</h1>
        <p className="text-sm text-slate-600 mt-1">
          Products you&apos;ve verified as an active user. Your verification adds to the community
          count displayed on each product page — helping others know what real investors actually use.
        </p>
      </header>

      <VerifiedClient initialRows={initialRows} />
    </main>
  );
}
