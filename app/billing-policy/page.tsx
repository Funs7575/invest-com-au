import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { AFSL_STATUS_DISCLOSURE } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Advisor billing & refund policy — Invest.com.au ${CURRENT_YEAR}`,
  description:
    "How Invest.com.au charges advisors: no lock-in, end-of-cycle downgrades, refunds default to portal credit (cash for billing errors / outages / fraud / dispute wins), 24-month credit expiry, self-service Stripe portal.",
  alternates: { canonical: absoluteUrl("/billing-policy") },
  openGraph: {
    title: "Advisor billing & refund policy",
    description:
      "No lock-in. Downgrades at end of cycle. Refunds as portal credit by default — cash for billing errors and outages.",
    url: absoluteUrl("/billing-policy"),
  },
};

export default function BillingPolicyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Advisor billing & refund policy" },
  ]);

  return (
    <main className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="py-10 md:py-16 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-2">
            Advisor billing
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Plain-English billing &amp; refund policy
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            No lock-in. Downgrades take effect at the end of your current
            cycle. Refunds default to portal credit so you can keep
            buying leads — we&rsquo;ll always issue a cash refund when
            the situation calls for it. Top-ups expire 24 months from
            issue; refund and proration credits never expire.
          </p>
        </div>
      </section>

      <article className="py-10 md:py-14 max-w-3xl mx-auto container-custom space-y-10 text-slate-700">
        <Section title="No lock-in, ever">
          <p>
            Cancel any time. There&rsquo;s no annual contract, no exit
            fee, and nothing to negotiate. You can self-serve every
            change from the advisor portal:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              Downgrade or cancel a paid tier — effective at the end of
              your current cycle. Unused subscription days come back to
              you as portal credit.
            </li>
            <li>
              Update your card on file via the Stripe Customer Portal.
            </li>
            <li>
              Pause new lead delivery by zeroing out your credit
              balance — you can resume any time by topping up.
            </li>
          </ul>
        </Section>

        <Section title="How charges work">
          <p>
            We earn money two ways and both are clearly itemised in your
            ledger.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <strong>Per-lead pricing</strong> — a flat per-lead fee is
              deducted from your credit balance each time we deliver an
              enquiry. Pricing depends on lead category and quality
              (international &amp; qualified leads cost more). Your
              first 3 leads are free.
            </li>
            <li>
              <strong>Optional monthly tier</strong> — Growth, Pro, or
              Elite. Adds priority placement, a per-lead discount, and
              tier-specific perks. No minimum, cancel any time.
            </li>
            <li>
              <strong>Add-ons</strong> — Featured Advisor (30 days) and
              Expert Article (one-off) are one-shot purchases, never
              recurring.
            </li>
          </ul>
        </Section>

        <Section title="Refunds: credit-first, with explicit cash exceptions">
          <p>
            We default to refunding to your portal credit balance. That
            keeps your money working in the system you&rsquo;re already
            using, and it&rsquo;s usually faster than waiting for a card
            chargeback. We&rsquo;ll always issue a <em>cash</em> refund
            (back to the original card) when:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>The charge was a billing error on our end.</li>
            <li>
              The platform was down for more than 4 hours during a
              billing period.
            </li>
            <li>The charge is the result of fraud or chargeback.</li>
            <li>
              A lead-quality dispute is resolved in your favour and the
              cash form was specifically requested.
            </li>
          </ul>
          <p className="text-sm text-slate-500">
            Anything else (mistaken top-up amount, change of mind on a
            tier upgrade, etc.) lands as portal credit by default. Ask
            us if you&rsquo;d prefer cash and we&rsquo;ll review.
          </p>
        </Section>

        <Section title="Credit expiry">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <strong>Top-up credits</strong> expire 24 months from the
              date of purchase. We&rsquo;ll email you 60 and 14 days
              before any portion expires.
            </li>
            <li>
              <strong>Refund credits</strong> (charge.refunded → portal
              credit) inherit the same 24-month window from the date of
              the refund.
            </li>
            <li>
              <strong>Proration credits</strong> (issued when you
              downgrade mid-cycle) <em>never</em> expire — that money
              is owed to you.
            </li>
            <li>
              <strong>Dispute refunds</strong> (lead resolved in your
              favour) never expire.
            </li>
          </ul>
        </Section>

        <Section title="Lead-quality disputes">
          <p>
            If a lead doesn&rsquo;t meet the criteria we promised
            (real contact details, in-scope jurisdiction, intent to
            engage), open a dispute from the lead detail page. Our
            auto-resolver looks at quality signals first; complex cases
            go to a human reviewer within 2 business days. Approved
            disputes refund the lead fee to your portal balance and
            mark the lead unbilled.
          </p>
          <p className="text-sm text-slate-500">
            Pro / Elite tier members have fast-track dispute review and
            can request a cash refund instead of credit when the
            dispute is approved.
          </p>
        </Section>

        <Section title="Self-service tools">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <strong>Stripe Customer Portal</strong> — update card,
              download invoices, see active subscriptions, cancel or
              switch tier. Open it from the &ldquo;Manage billing&rdquo;
              button in <Link href="/advisor-portal?tab=billing" className="text-blue-600 underline hover:text-blue-700">your billing tab</Link>.
            </li>
            <li>
              <strong>Unified ledger</strong> — every cent of activity
              (top-ups, lead spends, refunds, expiries, adjustments) is
              listed with a running balance. Audit-ready and exportable.
            </li>
            <li>
              <strong>Dispute centre</strong> — open or track lead
              disputes from the lead list view.
            </li>
          </ul>
        </Section>

        <Section title="AFSL framing">
          <p className="text-sm text-slate-600 leading-relaxed">
            {AFSL_STATUS_DISCLOSURE}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Advisor billing on this site is for marketplace placement
            and lead access — it does not affect, and is not connected
            to, the financial advice or services that advisors deliver
            to clients under their own AFSL.
          </p>
        </Section>

        <Section title="Questions?">
          <p className="text-sm text-slate-600">
            Email{" "}
            <a
              href="mailto:advisors@invest.com.au"
              className="text-blue-600 underline hover:text-blue-700"
            >
              advisors@invest.com.au
            </a>{" "}
            and we&rsquo;ll get back to you within one business day.
            Most billing questions can be answered directly from your
            ledger view in{" "}
            <Link
              href="/advisor-portal?tab=billing"
              className="text-blue-600 underline hover:text-blue-700"
            >
              the advisor portal
            </Link>
            .
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
