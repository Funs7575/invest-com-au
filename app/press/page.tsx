import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Press & Media — ${SITE_NAME}`,
  description: `Press resources, media enquiries and brand assets for ${SITE_NAME} — Australia's independent investing comparison platform.`,
  alternates: { canonical: "/press" },
};

const PRESS_MENTIONS: Array<{
  outlet: string;
  headline: string;
  url: string;
  date: string;
}> = [
  // This is editable list; populated by editorial as coverage lands.
  // Keep to recognised Australian outlets so the backlink is trusted.
];

const BRAND_COLORS = [
  { label: "Slate 900 (primary ink)", hex: "#0F172A" },
  { label: "Amber 500 (accent)", hex: "#F59E0B" },
  { label: "Emerald 600 (success)", hex: "#059669" },
];

/**
 * /press — press & media landing page.
 *
 * Serves three jobs:
 *   1. Journalists get a single URL to cite + contact details.
 *   2. Brand assets (logo, colours) live in one place for reuse.
 *   3. Press mentions become on-page backlinks so Google sees us
 *      as a source the media actually cites.
 */
export default function PressPage() {
  return (
    <div className="py-8 md:py-14">
      <div className="container-custom max-w-4xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-3">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Press &amp; Media</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
            Press &amp; media
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl">
            {SITE_NAME} is an independent Australian investing comparison
            platform. Our editorial team regularly comments on broker fees,
            platform outages, regulatory changes and consumer protection
            issues. If you&rsquo;re a journalist chasing a quote or data point,
            start here.
          </p>
        </div>

        {/* Contact card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Media enquiries</h2>
          <p className="text-sm text-slate-600 mb-4">
            For on-the-record quotes, expert commentary, or data requests:
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <strong className="text-slate-900">Email:</strong>{" "}
              <a
                href="mailto:press@invest.com.au"
                className="text-primary hover:underline"
              >
                press@invest.com.au
              </a>
            </li>
            <li>
              <strong className="text-slate-900">Response time:</strong>{" "}
              <span className="text-slate-600">Within 4 hours during AEST business hours.</span>
            </li>
            <li>
              <strong className="text-slate-900">Spokespeople:</strong>{" "}
              <Link href="/authors" className="text-primary hover:underline">
                View our editorial team →
              </Link>
            </li>
          </ul>
        </section>

        {/* About us blurb */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-3">About {SITE_NAME}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {SITE_NAME} helps everyday Australians compare share trading
            platforms, super funds, ETFs and professional advisors. We
            publish independent reviews, track broker fee changes in
            real time, and hand-match readers with ASIC-registered
            advisors. Every recommendation is editorial — commercial
            partners never preview or edit our content.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link
              href="/about"
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              About us
            </Link>
            <Link
              href="/editorial-policy"
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Editorial policy
            </Link>
            <Link
              href="/advertiser-terms"
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Advertiser terms
            </Link>
          </div>
        </section>

        {/* Brand assets */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Brand assets</h2>
          <p className="text-sm text-slate-600 mb-4">
            Please use the {SITE_NAME} wordmark as provided. Do not modify
            the colours or add gradients. The canonical URL is{" "}
            <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">
              {SITE_URL}
            </code>
            .
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {BRAND_COLORS.map((c) => (
              <div
                key={c.hex}
                className="rounded-lg border border-slate-200 p-3 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-md shrink-0"
                  style={{ background: c.hex }}
                  aria-hidden
                />
                <div>
                  <p className="text-xs font-semibold text-slate-900">{c.label}</p>
                  <p className="text-[11px] font-mono text-slate-500">{c.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Press mentions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Recent press mentions</h2>
          {PRESS_MENTIONS.length === 0 ? (
            <p className="text-sm text-slate-500">
              We&rsquo;re adding recent coverage here. If you&rsquo;ve
              referenced {SITE_NAME} in a published story, drop us a line
              and we&rsquo;ll link to it from this page.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {PRESS_MENTIONS.map((m) => (
                <li key={m.url} className="py-3">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener"
                    className="block group"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {m.outlet}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-primary mt-0.5">
                      {m.headline}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{m.date}</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
