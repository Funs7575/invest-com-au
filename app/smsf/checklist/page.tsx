import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import SmsfChecklistClient from "./SmsfChecklistClient";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 86400;

const SMSF_CHECKLIST_FAQS = [
  {
    q: "What are the key compliance obligations for an SMSF trustee?",
    a: "SMSF trustees must: maintain a trust deed and keep it current; have a documented investment strategy reviewed annually; appoint an ASIC-approved auditor each year; lodge the SMSF Annual Return by the due date (typically 31 October or later if using a tax agent); keep all fund records for a minimum of five years; and ensure the fund is maintained for the sole purpose of providing retirement benefits to members.",
  },
  {
    q: "When must the SMSF Annual Return be lodged?",
    a: "The due date is 31 October for SMSFs lodging on their own, or later (typically 15 May or 5 June the following year) if you use a registered tax agent. New SMSFs in their first year have different rules — check with your accountant or the ATO. Late lodgement attracts a Failure to Lodge penalty of $275 per 28-day period the return is outstanding.",
  },
  {
    q: "What happens if an SMSF fails its annual audit?",
    a: "If the auditor identifies compliance breaches, they must report them to the ATO on an Auditor Contravention Report (ACR). The ATO may then issue a notice of non-compliance, which strips the fund of its concessional tax treatment for the relevant year (the fund's income is taxed at 45%). Serious or repeated contraventions can result in trustee disqualification and civil penalties of up to $16,500 per contravention.",
  },
  {
    q: "Can a member of an SMSF also be a trustee?",
    a: "Yes — in fact it is required. Each member of an SMSF must be a trustee (or a director of the corporate trustee if the fund has a corporate trustee structure), and each trustee or director must be a member. The only exception is for single-member funds: a sole member can have a second individual as co-trustee who is not a member, or the fund can use a corporate trustee.",
  },
];

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
    images: [{ url: `/api/og?title=${encodeURIComponent("SMSF Compliance Checklist")}&sub=${encodeURIComponent("Setup · Ongoing Obligations · Annual Review · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function SmsfChecklistPage() {
  const faqLd = faqJsonLd(SMSF_CHECKLIST_FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Compliance Checklist", url: absoluteUrl("/smsf/checklist") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
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

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {SMSF_CHECKLIST_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                    {faq.q}
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-white border-t border-slate-200">
          <div className="container-custom max-w-2xl">
            <AdvisorPrompt
              type="smsf_accountant"
              heading="Work through your SMSF checklist with an expert"
            />
          </div>
        </section>
      </div>
    </>
  );
}
