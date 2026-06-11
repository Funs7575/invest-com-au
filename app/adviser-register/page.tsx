import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { registerMeta, topLicensees } from "@/lib/adviser-register";
import AdviserRegisterSearch from "./AdviserRegisterSearch";

export const revalidate = 86400;

const meta = registerMeta();

export const metadata: Metadata = {
  title: `Financial Adviser Register Search (${CURRENT_YEAR}) — Every Licensed Adviser in Australia`,
  description:
    "Search ASIC's Financial Advisers Register: look up any licensed financial adviser in Australia by name, adviser number, or licensee — free, no signup.",
  alternates: { canonical: absoluteUrl("/adviser-register") },
  ...(meta.sample ? { robots: { index: false, follow: false } } : {}),
};

const FAQS = [
  {
    question: "What is the Financial Advisers Register?",
    answer:
      "It's ASIC's public record of every person authorised to provide personal financial advice to retail clients in Australia. It shows an adviser's registration number, status, the AFS licensee they act for, and their qualifications history.",
  },
  {
    question: "How do I check if a financial adviser is licensed?",
    answer:
      "Search their name or adviser number above. A current registration means they're authorised under an Australian Financial Services licensee. Always confirm details on ASIC's MoneySmart register before engaging an adviser.",
  },
  {
    question: "Is this the official register?",
    answer:
      "No — this is a search tool built on ASIC's openly published register extract. The official source is ASIC via MoneySmart, and you should verify any record there before acting on it.",
  },
];

export default function AdviserRegisterPage() {
  const licensees = topLicensees(12);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Advisers", url: absoluteUrl("/advisors") },
          { name: "Adviser Register", url: absoluteUrl("/adviser-register") },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS.map((f) => ({ q: f.question, a: f.answer })))} />
      {!meta.sample && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "Financial Advisers Register — search index",
            description:
              "Searchable index of current financial advisers on ASIC's Financial Advisers Register, refreshed from the official open-data extract.",
            url: absoluteUrl("/adviser-register"),
            dateModified: meta.extractedAt,
            isBasedOn: "https://data.gov.au/dataset/financial-advisers-register",
            creator: { "@type": "Organization", name: SITE_NAME },
            license: "https://creativecommons.org/licenses/by/3.0/au/",
          }}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/advisors" className="hover:text-slate-700 transition-colors">Advisors</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">Adviser Register</span>
        </nav>

        {meta.sample && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Preview dataset.</strong> These records are
            synthetic placeholders while the full ASIC extract is loaded
            (<code className="text-xs">npm run data:far</code>). Nothing on these pages refers
            to a real adviser yet, and they are excluded from search engines.
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
          Look up any licensed financial adviser in Australia
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-8">
          Search {meta.sample ? "the" : `${meta.count.toLocaleString("en-AU")} current advisers on`}{" "}
          ASIC&apos;s Financial Advisers Register by name, adviser number, or licensee —
          free, no signup. Extract dated{" "}
          <time dateTime={meta.extractedAt} className="font-medium text-slate-700">{meta.extractedAt}</time>.
        </p>

        <AdviserRegisterSearch />

        {/* Browse by licensee */}
        {licensees.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-slate-900 mb-1.5">Largest licensees on the register</h2>
            <p className="text-xs text-slate-500 mb-4">
              AFS licensees ranked by the number of current advisers authorised under them.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {licensees.map((l) => (
                <li key={l.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <span className="text-sm font-medium text-slate-800 leading-snug">{l.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500 tabular-nums">
                    {l.count.toLocaleString("en-AU")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* How this differs from the directory */}
        <section className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Icon name="users" size={16} className="text-emerald-600" />
            Want an adviser who&apos;s ready to talk?
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed mb-3">
            The register tells you who is <em>licensed</em>. Our directory goes further —
            verified profiles, specialties, fees, and reviews from advisers who are
            accepting new clients.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/advisors"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Browse verified advisers
            </Link>
            <Link
              href="/find-advisor?specialty=FIRB+Property+(Non-Resident)"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              Get matched to one
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12 space-y-5">
          <h2 className="text-lg font-bold text-slate-900">Common questions</h2>
          {FAQS.map((f) => (
            <div key={f.question}>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{f.question}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </section>

        {/* Methodology + source */}
        <section className="mt-10 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-700 mb-1">About this data</p>
          <p>
            Records come from the Financial Advisers Register extract ASIC publishes as open
            data, filtered to current registrations. We refresh the extract regularly and show
            the extract date above. This page is general information only — always verify an
            adviser&apos;s current status on{" "}
            <a
              href="https://moneysmart.gov.au/financial-advice/financial-advisers-register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline hover:text-amber-800"
            >
              MoneySmart
            </a>{" "}
            before engaging them. Related tools:{" "}
            <Link href="/afsl-lookup" className="text-amber-700 underline hover:text-amber-800">AFSL licence lookup</Link>.
          </p>
        </section>

        <div className="mt-10">
          <ComplianceFooter />
        </div>
      </div>
    </div>
  );
}
