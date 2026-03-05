import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import type { Metadata } from "next";
import AdvisorsClient from "./AdvisorsClient";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Find a Financial Advisor in Australia (${CURRENT_YEAR})`,
  description:
    "Browse verified SMSF accountants, financial planners, property advisors, and tax agents. Free listings, pay only when you get an enquiry.",
  openGraph: {
    title: `Find a Financial Advisor — Invest.com.au`,
    description: "Browse verified Australian financial professionals. SMSF accountants, financial planners, property advisors, and more.",
    images: [{ url: "/api/og?title=Find+an+Advisor&subtitle=Verified+Australian+Financial+Professionals&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/advisors" },
};

export default async function AdvisorsPage() {
  const supabase = await createClient();

  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("status", "active")
    .order("verified", { ascending: false })
    .order("rating", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Suspense fallback={<AdvisorsLoading />}>
        <AdvisorsClient professionals={(professionals as Professional[]) || []} />
      </Suspense>
    </>
  );
}

function AdvisorsLoading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-4xl">
        <div className="h-6 w-48 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-72 bg-slate-100 rounded mb-6" />
        <div className="flex gap-2 mb-6">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 w-24 bg-slate-100 rounded-full" />)}</div>
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-xl" />)}</div>
      </div>
    </div>
  );
}
