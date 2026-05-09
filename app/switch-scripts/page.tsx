import type { Metadata } from "next";
import Link from "next/link";
import { listSwitchScripts } from "@/lib/switch-scripts";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Broker switch scripts — negotiation + transfer guides | ${SITE_NAME}`,
  description:
    "Editorial scripts for negotiating with your current broker AND step-by-step instructions for switching. CHESS in-specie transfer, ACATS for US holdings, AU tax considerations.",
  alternates: { canonical: absoluteUrl("/switch-scripts") },
};

export default function SwitchScriptsIndexPage() {
  const scripts = listSwitchScripts();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
          Broker switch scripts
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-700">
          Most users never ask their existing broker for a better deal — and
          most brokers won't volunteer one. These scripts help you negotiate
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
