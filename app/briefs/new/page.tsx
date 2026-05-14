import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import BriefForm from "./BriefForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Create an Investor Brief (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Create a structured Investor Brief so verified Australian providers — individuals, firms or expert teams — can understand what you need and respond. General information only; the provider you engage delivers the service.",
  alternates: { canonical: `${SITE_URL}/briefs/new` },
  robots: { index: true, follow: true },
};

const TRUST_BLOCKS = [
  {
    icon: "shield-check",
    title: "Verified providers only",
    desc: "Every professional, firm and team is verified before they can receive briefs.",
  },
  {
    icon: "lock",
    title: "Your contact details stay private",
    desc: "Providers see a masked preview. Contact details only unlock after a provider accepts.",
  },
  {
    icon: "users",
    title: "You stay in control",
    desc: "Route to an individual, a firm, or an expert team. Pick the response that fits.",
  },
  {
    icon: "info",
    title: "General information",
    desc: "We are a marketplace, not an adviser. Services are delivered by the provider you engage.",
  },
];

export default function NewBriefPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  void searchParams;
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Investor Briefs", url: `${SITE_URL}/briefs` },
    { name: "Create" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Investor Brief · Australia
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold mb-4">
              Create an Investor Brief
            </h1>
            <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Tell verified Australian professionals, firms or expert teams what
              you need help with. They&apos;ll see a masked preview and respond
              only if it&apos;s a fit. You stay in control of who sees your
              contact details.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto mt-12">
            {TRUST_BLOCKS.map((t) => (
              <div
                key={t.title}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <Icon name={t.icon} size={20} className="text-amber-400 mb-2" />
                <p className="text-sm font-bold text-white mb-1">{t.title}</p>
                <p className="text-xs text-slate-400 leading-snug">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <BriefForm />
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 text-center">
            How an Investor Brief works
          </h2>
          <p className="text-sm text-slate-500 mb-10 text-center max-w-2xl mx-auto">
            A structured way to bring verified providers into your decision.
            Invest.com.au never gives personal advice — the professional or
            firm you engage delivers the service under their own licence.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                n: 1,
                title: "Tell us what you need",
                desc: "Pick a template, answer a few structured questions, and set how you want to be matched.",
              },
              {
                n: 2,
                title: "Verified providers may respond",
                desc: "Eligible individuals, firms or expert teams see a masked preview and can accept with credits to unlock your details.",
              },
              {
                n: 3,
                title: "Follow along in the Brief Tracker",
                desc: "Status, next step, and accepted provider — all in one place. The service itself sits with the professional.",
              },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-full font-extrabold flex items-center justify-center mx-auto mb-3 text-lg">
                  {s.n}
                </div>
                <p className="font-bold text-slate-900 mb-1">{s.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
