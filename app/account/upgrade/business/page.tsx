import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BusinessUpgradeForm from "./BusinessUpgradeForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add business profile — Invest.com.au",
  robots: "noindex, nofollow",
};

interface PageProps {
  searchParams: Promise<{ prefill?: string; edit?: string }>;
}

export default async function BusinessUpgradePage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/account/upgrade/business");
  }

  const params = await searchParams;
  const prefillName = params.prefill ?? null;
  const isEdit = params.edit === "1";

  // If editing, fetch the existing row to pre-populate the form.
  let existing: {
    business_name: string;
    legal_name: string | null;
    abn: string | null;
    acn: string | null;
    industry: string | null;
    employees_band: string | null;
    revenue_band: string | null;
    primary_state: string | null;
    year_established: number | null;
  } | null = null;
  if (isEdit) {
    const { data } = await supabase
      .from("business_accounts")
      .select("business_name, legal_name, abn, acn, industry, employees_band, revenue_band, primary_state, year_established")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (data) existing = data;
  }

  return (
    <main className="bg-slate-50 min-h-[60vh]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 mb-2">
            <span aria-hidden className="mr-1.5">🏢</span>
            {isEdit ? "Edit business profile" : "Add business workspace"}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEdit ? "Update your business" : "Tell us about your business"}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Adds a Business Owner workspace to your account so you can track grants, run R&D claim eligibility, and prep your business for sale. Comparison + factual computation only — no personal advice.
          </p>
        </header>
        <BusinessUpgradeForm
          existing={existing}
          prefillName={prefillName}
          isEdit={isEdit}
        />
      </div>
    </main>
  );
}
