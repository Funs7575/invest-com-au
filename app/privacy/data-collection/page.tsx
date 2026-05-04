import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import {
  COMPANY_ABN,
  COMPANY_ACN,
  COMPANY_LEGAL_NAME,
  DATA_PROCESSOR_NOTE,
  GDPR_RIGHTS_NOTE,
} from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What data we collect — Invest.com.au",
  description:
    "A plain-language breakdown of every category of personal data Invest.com.au collects, why we collect it, how long we keep it, and who we share it with — Australian Privacy Act 1988 + GDPR.",
  alternates: { canonical: "/privacy/data-collection" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "What data we collect — Invest.com.au",
    description:
      "Plain-language breakdown of what personal data we collect, why, how long we keep it, and who we share it with.",
    url: "/privacy/data-collection",
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Privacy Policy", url: absoluteUrl("/privacy") },
  { name: "What data we collect" },
]);

export default function DataCollectionPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="py-6 md:py-12">
        <div className="container-custom max-w-3xl">
          <nav className="text-xs text-slate-500 mb-4">
            <Link href="/privacy" className="hover:text-slate-900">
              ← Privacy Policy
            </Link>
          </nav>

          <h1 className="text-3xl font-extrabold mb-2">
            What data we collect
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}, ABN {COMPANY_ABN}) —
            last updated March 2026
          </p>

          <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-10">
            <section>
              <h2 className="text-lg font-bold mb-3">Overview</h2>
              <p className="text-slate-600">
                We only collect personal information that is reasonably
                necessary for our functions as an information service. We do
                not sell your personal information to third parties. This page
                is a plain-language supplement to our{" "}
                <Link href="/privacy" className="text-blue-600 underline">
                  full Privacy Policy
                </Link>{" "}
                and is published to meet our transparency obligations under
                Australian Privacy Principle 1 (APP-1).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">
                Categories of data we collect
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Category
                      </th>
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        What we collect
                      </th>
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Why
                      </th>
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Legal basis
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Newsletter / email opt-in
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Email address
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Send requested newsletters, rate alerts, or lead-magnet
                        resources
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Consent (APP-3)
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Enquiry / lead submission
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Name, email address, phone number, country of
                        residence, investment amount, investment timeline,
                        free-text message
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Connect you with the specific financial services
                        provider you enquired about
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Consent (APP-3); necessary to provide the service you
                        requested (APP-6)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Quiz / matching answers
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Financial situation indicators (investment experience,
                        goals, risk tolerance, budget — no bank details)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Personalise comparison results and advisor matching
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Consent (APP-3)
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        User account profile
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Email address, display name, optional profile
                        preferences
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Authenticate you across sessions; personalise
                        watchlists and saved comparisons
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Contract (APP-6)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Reviews and ratings
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Star rating, text review, reviewer display name
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Publish user-generated broker / advisor reviews
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Consent (APP-3); legitimate interests (maintaining
                        editorial integrity)
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Usage analytics
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Pseudonymous device ID, page URL, referrer, approximate
                        city / country (PostHog — no IP stored beyond the
                        request)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Understand which content is helpful; improve site
                        performance
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Legitimate interests (APP-6); GDPR Art. 6(1)(f) with
                        opt-out available
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Affiliate click tracking
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Pseudonymous session ID, broker slug clicked,
                        timestamp, referrer URL — no name or email
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Attribute revenue and verify partner payment accuracy
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Legitimate interests (APP-6)
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Error / performance monitoring
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Stack traces, request IDs, browser version — Sentry
                        scrubs PII before storage per their data-scrubbing
                        defaults
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Detect and fix bugs; meet our SLOs
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Legitimate interests (APP-6)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">Retention windows</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Data type
                      </th>
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Retention period
                      </th>
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Rationale
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr>
                      <td className="p-2 border border-slate-200 align-top">
                        User account profile
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        While account is active + 30 days after deletion
                        request confirmed
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Privacy Act minimisation
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 align-top">
                        Quiz / matching leads
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        2 years from last interaction
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Re-engagement window
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 align-top">
                        Advisor application data
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        7 years
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        AFSL audit-trail requirement
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 align-top">
                        Lead dispute records
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        7 years
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        AFSL audit-trail requirement
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 align-top">
                        Anonymous saved comparisons (unclaimed)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        90 days, then purged automatically
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Data minimisation
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 align-top">
                        Email opt-in / suppression list
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Indefinite (suppression must persist past account
                        deletion)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Anti-spam compliance (Spam Act 2003)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 align-top">
                        Usage analytics (PostHog)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        90 days rolling window, then auto-purged
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Data minimisation
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 align-top">
                        Affiliate click records
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        2 years (pseudonymous session ID only)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Revenue attribution audit trail
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 align-top">
                        Error logs (Sentry)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        90 days (per Sentry plan)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Bug-triage window
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 align-top">
                        Admin action log (PII access)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        7 years
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        AFSL audit-trail + OAIC accountability
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 align-top">
                        Security breach records
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        7 years
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        OAIC + regulatory obligation
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">
                Third-party data processors
              </h2>
              <p className="text-slate-600 mb-3">{DATA_PROCESSOR_NOTE}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Processor
                      </th>
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Purpose
                      </th>
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Data transferred
                      </th>
                      <th className="text-left p-2 border border-slate-200 font-semibold">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Supabase
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Database (all user data)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        All personal data categories above
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        AWS Sydney (ap-southeast-2)
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Vercel
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Hosting / CDN
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        IP address, request headers (ephemeral — not stored by
                        us)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Global edge; origin US
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Resend
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Transactional email delivery
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Email address, name, email body
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        US
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        PostHog
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Product analytics
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Pseudonymous event data (no email or name)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        US (EU option available)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Sentry
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Error monitoring
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Sanitised stack traces (PII scrubbed by Sentry
                        defaults)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        US
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 border border-slate-200 font-medium align-top">
                        Stripe
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Payment processing (advisor subscriptions)
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        Billing email, Stripe customer ID — no card numbers
                        stored by us
                      </td>
                      <td className="p-2 border border-slate-200 align-top">
                        US
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">
                EEA / GDPR — additional rights
              </h2>
              <p className="text-slate-600">{GDPR_RIGHTS_NOTE}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">Your rights</h2>
              <p className="text-slate-600 mb-3">
                Under the Australian Privacy Act 1988 and, where applicable,
                the GDPR, you have the right to:
              </p>
              <ul className="list-disc pl-5 text-slate-600 space-y-1">
                <li>
                  <strong>Access</strong> — request a copy of all personal
                  data we hold linked to your email address
                </li>
                <li>
                  <strong>Correction</strong> — ask us to correct inaccurate
                  data
                </li>
                <li>
                  <strong>Erasure</strong> — ask us to delete your data
                  (subject to legal-hold obligations)
                </li>
                <li>
                  <strong>Opt out</strong> — unsubscribe from marketing emails
                  at any time via the unsubscribe link in any email we send
                </li>
                <li>
                  <strong>Withdraw analytics consent</strong> — opt out of
                  PostHog analytics at any time in your{" "}
                  <Link
                    href="/account/privacy"
                    className="text-blue-600 underline"
                  >
                    privacy settings
                  </Link>
                </li>
              </ul>
              <p className="text-slate-600 mt-4">
                To exercise access or erasure rights, use our self-service
                portal:
              </p>
              <div className="mt-3">
                <Link
                  href="/privacy/data-rights"
                  className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Request data access or deletion →
                </Link>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">Contact</h2>
              <p className="text-slate-600">
                For privacy questions or complaints not resolved via the
                self-service portal, contact our Privacy Officer:
              </p>
              <ul className="mt-2 text-slate-600 space-y-1">
                <li>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:privacy@invest.com.au"
                    className="text-blue-600 underline"
                  >
                    privacy@invest.com.au
                  </a>
                </li>
                <li>
                  <strong>Entity:</strong> {COMPANY_LEGAL_NAME} (ACN{" "}
                  {COMPANY_ACN})
                </li>
              </ul>
              <p className="text-slate-600 mt-3 text-xs">
                If your complaint is not resolved within 30 days, you may
                escalate to the{" "}
                <a
                  href="https://www.oaic.gov.au/make-a-privacy-complaint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Office of the Australian Information Commissioner (OAIC)
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
