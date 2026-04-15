import type { Metadata } from "next";
import Link from "next/link";
import { listSegments } from "@/lib/newsletter";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import SubscribeForm from "./SubscribeForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Subscribe to the weekly investing newsletter",
  description:
    "Join thousands of Australian investors getting weekly fee changes, new broker reviews, and editorial picks. Free, no spam, one-click unsubscribe.",
  openGraph: {
    title: `Subscribe to the Invest.com.au Newsletter — ${SITE_NAME}`,
    description:
      "Weekly fee changes, new broker reviews, editorial picks. Free, no spam.",
    url: absoluteUrl("/newsletter/subscribe"),
    images: [
      {
        url: "/api/og?title=Subscribe+to+the+Newsletter&subtitle=Weekly+fee+changes+%26+editorial+picks&type=article",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/newsletter/subscribe" },
};

export default async function NewsletterSubscribePage() {
  const segments = await listSegments();
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Newsletter", url: absoluteUrl("/newsletter") },
    { name: "Subscribe" },
  ]);

  return (
    <div className="pt-5 pb-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="container-custom max-w-2xl">
        {/* Breadcrumbs */}
        <nav className="text-xs md:text-sm text-slate-500 mb-2 md:mb-4">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/newsletter" className="hover:text-slate-900">
            Newsletter
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Subscribe</span>
        </nav>

        <div className="bg-gradient-to-br from-amber-50 via-white to-white border border-amber-200 rounded-2xl p-6 md:p-10 mb-6">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
            Free · Weekly
          </p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Get the weekly investing digest
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-xl mb-6 leading-relaxed">
            Every Monday morning, we send a short email with broker fee changes,
            new reviews, editorial picks and one actionable investing insight.
            No spam, no paid promotions dressed up as recommendations, one-click
            unsubscribe at the bottom of every email.
          </p>

          <SubscribeForm segments={segments} />

          <div className="mt-6 pt-5 border-t border-amber-200">
            <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wide">
              What you&apos;ll get
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold mt-0.5">✓</span>
                <span>
                  <strong className="font-semibold text-slate-900">
                    Broker fee changes
                  </strong>{" "}
                  — when brokers quietly raise or drop fees, you&apos;ll know
                  first.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold mt-0.5">✓</span>
                <span>
                  <strong className="font-semibold text-slate-900">
                    New broker reviews
                  </strong>{" "}
                  — fully independent, with real fee breakdowns and CHESS /
                  SMSF details.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold mt-0.5">✓</span>
                <span>
                  <strong className="font-semibold text-slate-900">
                    Deals worth taking
                  </strong>{" "}
                  — only sign-up offers that actually outperform the default
                  pricing.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold mt-0.5">✓</span>
                <span>
                  <strong className="font-semibold text-slate-900">
                    One actionable insight
                  </strong>{" "}
                  — a single idea each week you can act on, not a wall of
                  market commentary.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-[11px] md:text-xs text-slate-500 leading-relaxed">
          <p className="mb-1">
            We use double opt-in: we&apos;ll send a confirmation link to your
            inbox and you won&apos;t receive anything else until you click it.
          </p>
          <p>
            Your email is never sold or shared. You can unsubscribe with one
            click at the bottom of every email. See our{" "}
            <Link href="/privacy" className="underline hover:text-slate-900">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
