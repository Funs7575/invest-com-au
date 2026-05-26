import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Widget Licensing — White-Label Tiers | ${SITE_NAME}`,
  description:
    "Remove the invest.com.au attribution footer from your embedded broker and fee widgets. White-label widget licensing for Pro and Enterprise API customers.",
  alternates: { canonical: "/embed/licensing" },
};

function TierCard({
  name,
  badge,
  badgeClass,
  price,
  features,
  cta,
  ctaHref,
  ctaClass,
}: {
  name: string;
  badge?: string;
  badgeClass?: string;
  price: string;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaClass: string;
}) {
  return (
    <div className="border border-slate-200 rounded-2xl p-6 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-extrabold text-lg text-slate-900">{name}</div>
          <div className="text-sm text-slate-500 mt-0.5">{price}</div>
        </div>
        {badge && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>
      <ul className="space-y-2 flex-1 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <Icon name="check" size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Link href={ctaHref} className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${ctaClass}`}>
        {cta}
      </Link>
    </div>
  );
}

export default function EmbedLicensingPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Embed Widgets", url: absoluteUrl("/embed") },
    { name: "Widget Licensing" },
  ]);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <section className="border-b border-slate-100 py-8 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/embed" className="hover:text-slate-900">Embed Widgets</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Widget Licensing</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-slate-900 mb-3">
            White-Label Widget Licensing
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
            Remove the &ldquo;Powered by invest.com.au&rdquo; attribution footer from your embedded
            widgets. Available to Pro and Enterprise API customers via a license token.
          </p>
        </div>
      </section>

      <section className="container-custom max-w-4xl py-8 md:py-12 space-y-12">

        {/* Tier grid */}
        <div className="grid sm:grid-cols-3 gap-5">
          <TierCard
            name="Free"
            price="No API key required"
            features={[
              "All 7 widget types",
              "Light + dark themes",
              "Unlimited embed domains",
              "Partner attribution (?ref=)",
              "\"Powered by invest.com.au\" footer included",
            ]}
            cta="Get embed code"
            ctaHref="/embed"
            ctaClass="bg-slate-100 text-slate-700 hover:bg-slate-200"
          />
          <TierCard
            name="Pro"
            badge="White-label"
            badgeClass="bg-emerald-50 text-emerald-700"
            price="Pro API plan"
            features={[
              "Everything in Free",
              "Remove attribution footer",
              "Up to 10 license tokens",
              "Domain allowlist (optional)",
              "fee.changed webhook events",
              "All /api/v1 data endpoints",
            ]}
            cta="Upgrade to Pro"
            ctaHref="/api-docs#billing"
            ctaClass="bg-emerald-600 text-white hover:bg-emerald-700"
          />
          <TierCard
            name="Enterprise"
            badge="Custom"
            badgeClass="bg-violet-50 text-violet-700"
            price="Contact us"
            features={[
              "Everything in Pro",
              "Up to 10 license tokens",
              "Volume rate limits",
              "Dedicated support + SLA",
              "Custom data integrations",
              "White-label API subdomain (on request)",
            ]}
            cta="Contact us"
            ctaHref="mailto:api@invest.com.au"
            ctaClass="bg-slate-900 text-white hover:bg-slate-800"
          />
        </div>

        {/* How it works */}
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-5">How white-label embedding works</h2>
          <ol className="space-y-4">
            {[
              {
                step: "1",
                title: "Upgrade to a Pro API key",
                body: (
                  <>
                    Log in and upgrade your API key at{" "}
                    <Link href="/api-docs#billing" className="underline text-emerald-700 hover:text-emerald-800">
                      api-docs → Billing
                    </Link>
                    , or create a new Pro key via <code className="font-mono text-xs bg-slate-100 px-1 rounded">POST /api/v1/api-keys</code>.
                  </>
                ),
              },
              {
                step: "2",
                title: "Create a widget license token",
                body: (
                  <>
                    <code className="font-mono text-xs bg-slate-100 px-1 rounded">POST /api/v1/widget-licenses</code> with your Pro key.
                    You get back a <code className="font-mono text-xs bg-slate-100 px-1 rounded">wlt_xxx</code> token.
                    Save it securely — it is shown once.
                  </>
                ),
              },
              {
                step: "3",
                title: "Use the licensed widget URL",
                body: (
                  <>
                    Replace <code className="font-mono text-xs bg-slate-100 px-1 rounded">/api/widget</code> with{" "}
                    <code className="font-mono text-xs bg-slate-100 px-1 rounded">/api/widget/licensed?license=wlt_xxx</code>.
                    All other widget params (<code className="font-mono text-xs bg-slate-100 px-1 rounded">?theme=</code>,{" "}
                    <code className="font-mono text-xs bg-slate-100 px-1 rounded">?brokers=</code>, etc.) still work identically.
                  </>
                ),
              },
              {
                step: "4",
                title: "Optionally restrict to your domains",
                body: (
                  <>
                    Pass <code className="font-mono text-xs bg-slate-100 px-1 rounded">allowed_domains: [&quot;example.com&quot;]</code> when
                    creating the license. If the embed origin is not in the list, the footer is silently re-added as a safety fallback.
                    Leave <code className="font-mono text-xs bg-slate-100 px-1 rounded">allowed_domains</code> empty to allow all domains.
                  </>
                ),
              },
            ].map(({ step, title, body }) => (
              <li key={step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-sm flex items-center justify-center border border-emerald-200">
                  {step}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm mb-1">{title}</div>
                  <div className="text-sm text-slate-600 leading-relaxed">{body}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Code snippet */}
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Example embed code</h2>
          <p className="text-sm text-slate-600 mb-4">
            Free (with &ldquo;Powered by&rdquo; footer):
          </p>
          <div className="bg-slate-900 rounded-xl px-5 py-4 mb-5">
            <code className="text-xs text-emerald-400 font-mono break-all select-all">
              {`<script src="https://invest.com.au/api/widget?brokers=stake,commsec&theme=light"></script>`}
            </code>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Pro white-label (footer removed, same widget content):
          </p>
          <div className="bg-slate-900 rounded-xl px-5 py-4">
            <code className="text-xs text-emerald-400 font-mono break-all select-all">
              {`<script src="https://invest.com.au/api/widget/licensed?license=wlt_xxx&brokers=stake,commsec&theme=light"></script>`}
            </code>
          </div>
        </div>

        {/* Fee-change webhooks */}
        <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/60">
          <div className="flex items-start gap-3 mb-3">
            <Icon name="bell" size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-extrabold text-slate-900">Fee-change webhooks</h2>
              <p className="text-sm text-slate-600 mt-1">
                Pro and Enterprise API keys can also subscribe to{" "}
                <code className="font-mono text-xs bg-white border border-slate-200 px-1 rounded">fee.changed</code>{" "}
                webhook events — receive a POST to your endpoint every time any broker changes
                an ASX fee, US fee, FX margin, inactivity fee, or minimum deposit.
              </p>
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl px-5 py-4 mt-3">
            <code className="text-xs text-emerald-400 font-mono break-all">
              {`POST /api/v1/webhooks\nAuthorization: Bearer ica_your_pro_key\n\n{"url":"https://yoursite.com/webhooks/fee-alerts","events":["fee.changed"]}`}
            </code>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Webhooks are signed with HMAC-SHA256. See{" "}
            <Link href="/api-docs#webhooks" className="underline hover:text-slate-900">
              API docs → Webhooks
            </Link>{" "}
            for payload schema and signature verification.
          </p>
        </div>

        {/* CTA */}
        <div className="border border-slate-200 rounded-2xl p-6 flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[12rem]">
            <h2 className="font-extrabold text-slate-900 mb-1">Ready to get started?</h2>
            <p className="text-sm text-slate-600">
              Upgrade to a Pro API key, create a license token, and swap your embed URL.
              Questions? Email{" "}
              <a href="mailto:api@invest.com.au" className="underline text-emerald-700 hover:text-emerald-800">
                api@invest.com.au
              </a>
              .
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/embed"
              className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Free widgets
            </Link>
            <Link
              href="/api-docs#billing"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              Get Pro access →
            </Link>
          </div>
        </div>

      </section>
    </div>
  );
}
