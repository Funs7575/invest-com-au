import type { Metadata } from "next";
import Link from "next/link";
import { listSwitchScripts } from "@/lib/switch-scripts";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import JsonLd from "@/components/JsonLd";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Broker switch scripts — negotiation + transfer guides | ${SITE_NAME}`,
  description:
    "Editorial scripts for negotiating with your current broker AND step-by-step instructions for switching. CHESS in-specie transfer, ACATS for US holdings, AU tax considerations.",
  alternates: { canonical: absoluteUrl("/switch-scripts") },
};

const SWITCH_SCRIPTS_FAQ = faqJsonLd([
  {
    q: "What is a switch script for a broker transfer?",
    a: "A switch script is a step-by-step call guide that helps you negotiate a better deal with your current broker or, if you decide to leave, walk through the transfer process. The scripts cover what to say, what fees to ask about, and how to initiate an in-specie transfer (CHESS for ASX holdings) or ACATS transfer (for US holdings) without liquidating your positions.",
  },
  {
    q: "How do I contact my broker to transfer out?",
    a: "Most Australian brokers require you to call their client services line or submit a written transfer request to initiate an outgoing transfer. Our broker-specific scripts give you the exact phone number, the department to ask for, and the key phrases that move the process forward quickly. Have your account number, HIN (for CHESS transfers), and new broker details ready before you call.",
  },
  {
    q: "Can I transfer my shares out of a custodial broker?",
    a: "Yes, but the process depends on whether your shares are CHESS-sponsored or held in custody. CHESS-sponsored brokers can transfer your holdings in-specie to a new CHESS-sponsored broker without selling. Custodial brokers may require you to sell your holdings and transfer cash, or they may support an off-market transfer — our scripts detail the options for each broker.",
  },
  {
    q: "How long does a broker transfer take?",
    a: "CHESS in-specie transfers between Australian brokers typically take 3–10 business days once the transfer form is submitted and approved. International transfers (e.g. ACATS for US-listed stocks) can take 5–10 business days. Cash transfers usually settle within 1–3 business days. Processing times vary by broker — our scripts include typical timeframes for each provider.",
  },
  {
    q: "What information do I need before calling my broker to transfer?",
    a: "Before calling, gather your account number, HIN (Holder Identification Number for CHESS accounts), the name and account details of your receiving broker, a list of holdings you want to transfer, and any recent statements. For international holdings you may also need the DTC participant number of the receiving broker. Our scripts list the exact documents and details required for each broker.",
  },
]);

export default function SwitchScriptsIndexPage() {
  const scripts = listSwitchScripts();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Broker Switch Scripts" },
  ]);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <JsonLd data={breadcrumb} testId="switch-scripts-jsonld" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SWITCH_SCRIPTS_FAQ) }}
      />
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
    </main>
  );
}
