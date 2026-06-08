import type { Metadata } from "next";
import Link from "next/link";
import { listSwitchScripts } from "@/lib/switch-scripts";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import JsonLd from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Broker switch scripts — negotiation + transfer guides | ${SITE_NAME}`,
  description:
    "Editorial scripts for negotiating with your current broker AND step-by-step instructions for switching. CHESS in-specie transfer, ACATS for US holdings, AU tax considerations.",
  alternates: { canonical: absoluteUrl("/switch-scripts") },
};

const SWITCH_SCRIPTS_FAQS = [
  {
    q: "What is a broker switch script and how do I use it?",
    a: "A broker switch script is a step-by-step guide that helps you: (1) negotiate a fee reduction with your existing broker before switching — many brokers will match a competitor's rate if asked the right way; and (2) if negotiation fails, transfer your holdings to a cheaper platform using the correct process for your asset type. Each script covers how to phrase the negotiation request, what to do if the broker says no, and the exact transfer steps for ASX shares (CHESS in-specie transfer), US shares (ACATS transfer), and any tax events the transfer may trigger.",
  },
  {
    q: "Will an in-specie transfer trigger a capital gains tax event?",
    a: "An in-specie transfer of ASX shares within the CHESS system does not trigger a CGT disposal event — ownership transfers to the new broker without a sale. Your original cost base and acquisition date are preserved. However, some brokers hold international shares in custodial (non-CHESS) accounts — transferring these out of a custodial structure to a CHESS-registered broker may require selling and rebuying, which does trigger a CGT event. Each switch script explains the specific tax treatment for that broker's custodial arrangement. Consult your accountant before transferring large positions.",
  },
  {
    q: "How long does a CHESS in-specie transfer take?",
    a: "CHESS in-specie transfers between ASX brokers typically take 3–10 business days from the time you initiate the transfer. The process involves the receiving broker requesting the holdings from CHESS and the originating broker releasing them. Both brokers must confirm the transfer. Your holdings are locked during the transfer — you cannot trade them. Allow for the full 10 business days if you are approaching an ex-dividend date or an event that requires open positions.",
  },
  {
    q: "Can I negotiate a fee reduction without switching?",
    a: "Yes — and the scripts are designed for this first. Most users who ask their broker for a rate match receive either a direct discount or a fee-waiver on their next few trades. Brokers rarely advertise this proactively because most customers don't ask. The negotiation script gives you the exact phrasing: how to reference competitor pricing, what to say if they refuse, and when to escalate to a supervisor. If negotiation fails, the switch section gives you the transfer steps.",
  },
];

const switchScriptsFaqLd = faqJsonLd(SWITCH_SCRIPTS_FAQS);

export default function SwitchScriptsIndexPage() {
  const scripts = listSwitchScripts();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Broker Switch Scripts" },
  ]);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <JsonLd data={breadcrumb} testId="switch-scripts-jsonld" />
      {switchScriptsFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(switchScriptsFaqLd) }}
        />
      )}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
          Broker switch scripts
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-700">
          Most users never ask their existing broker for a better deal — and
          most brokers won&rsquo;t volunteer one. These scripts help you negotiate
          first, then walk you through the transfer process if you do decide to
          leave (CHESS in-specie for ASX, ACATS for US, with AU tax notes).
        </p>
      </header>

      <ul className="space-y-4">
        {scripts.map((s) => (
          <li key={s.brokerSlug}>
            <Link
              href={`/switch-scripts/${s.brokerSlug}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-900">
                Switch from {s.brokerName}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{s.whySwitch}</p>
              <span className="mt-4 inline-block text-sm font-medium text-amber-700">
                Read the script →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500">
        <p>{GENERAL_ADVICE_WARNING}</p>
      </footer>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {SWITCH_SCRIPTS_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
