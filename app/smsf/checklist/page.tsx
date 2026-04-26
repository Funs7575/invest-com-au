import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import SmsfChecklistClient from "./SmsfChecklistClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "SMSF Compliance Checklist: 12 Items Trustees Must Track | Invest.com.au",
  description:
    "Interactive SMSF compliance checklist — setup, ongoing and review obligations. Tick each item as you complete it and email yourself the result.",
  alternates: { canonical: `${SITE_URL}/smsf/checklist` },
  openGraph: {
    title: "SMSF Compliance Checklist: 12 Items Trustees Must Track",
    description: "Setup, ongoing and review obligations — interactive and printable.",
    url: `${SITE_URL}/smsf/checklist`,
    type: "website",
  },
};

export default function SmsfChecklistPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Compliance Checklist", url: absoluteUrl("/smsf/checklist") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">SMSF Compliance Checklist</h1>
            <p className="text-slate-300">12 items every SMSF trustee should tick off — setup, ongoing and annual review.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <SmsfChecklistClient />
          </div>
        </section>
      </div>
    </>
  );
}
