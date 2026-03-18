import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
} from "@/lib/compliance";

export const metadata = {
  title: "Developer & Buyer's Agent Listing Terms — Invest.com.au",
  description:
    "Terms and conditions for property developers and buyer's agents listed on the Invest.com.au property vertical.",
  alternates: { canonical: "/developer-terms" },
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "18 March 2026";
const VERSION = "1.0";

export default function DeveloperTermsPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Developer & Agent Listing Terms" },
  ]);

  const S = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6">
      <h2 className="text-base md:text-lg font-bold text-slate-900 mb-2">{n}. {title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="py-5 md:py-12">
        <div className="container-custom max-w-3xl">
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Developer & Agent Listing Terms</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">
            Developer &amp; Buyer&apos;s Agent Listing Terms
          </h1>
          <p className="text-xs text-slate-400 mb-2">Version {VERSION} — Effective {EFFECTIVE_DATE}</p>
          <p className="text-xs text-slate-400 mb-8">
            {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}, ABN {COMPANY_ABN})
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-amber-700">
              This agreement governs your participation as a property developer or buyer&apos;s agent
              on {SITE_NAME}. By submitting a listing or profile, you agree to these terms. These
              terms are separate from the{" "}
              <Link href="/advisor-terms" className="underline hover:text-amber-900">Advisor Services Agreement</Link>,
              which governs financial professionals (financial advisers, mortgage brokers, accountants).
            </p>
          </div>

          <div className="space-y-6">
            <S n={1} title="Parties">
              <p>
                This agreement is between {COMPANY_LEGAL_NAME} (&quot;we&quot;, &quot;us&quot;,
                &quot;Platform&quot;) and the property developer or buyer&apos;s agent
                (&quot;you&quot;, &quot;Developer&quot;, &quot;Agent&quot;) who lists
                on the {SITE_NAME} property vertical.
              </p>
            </S>

            <S n={2} title="Nature of Service">
              <p>
                {SITE_NAME} is an information and comparison platform, not a real estate
                agent or mortgage broker. We do not hold a real estate agent&apos;s licence
                in any Australian state or territory. We provide:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>A listing directory for new property developments and off-the-plan sales</li>
                <li>A directory of buyer&apos;s agents for referral by consumers</li>
                <li>Lead generation services (consumer enquiry forms)</li>
                <li>Suburb research data and general property information</li>
              </ul>
              <p>
                We do not act as your agent, represent buyers on your behalf, or participate
                in any property transaction.
              </p>
            </S>

            <S n={3} title="Developer Listing Requirements">
              <p>
                To list a property development on {SITE_NAME}, you must:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Be a licensed property developer or authorised sales representative
                  in the relevant Australian state or territory.
                </li>
                <li>
                  Provide accurate and complete information about each development,
                  including indicative pricing, property type, completion date, and
                  FIRB approval status where applicable.
                </li>
                <li>
                  Immediately notify us of any material changes to listed information,
                  including price changes, settlement delays, or project cancellations.
                </li>
                <li>
                  Ensure that any off-the-plan sales comply with applicable state laws,
                  including mandatory cooling-off periods and disclosure statement
                  requirements.
                </li>
                <li>
                  Not list developments that are not genuinely for sale or that have
                  not received necessary planning approvals.
                </li>
              </ul>
            </S>

            <S n={4} title="Buyer's Agent Listing Requirements">
              <p>
                To list as a buyer&apos;s agent on {SITE_NAME}, you must:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Hold a valid real estate agent&apos;s licence (or buyer&apos;s agent
                  licence where available) in each state or territory in which you
                  operate. You must provide your licence number and it will be displayed
                  on your profile.
                </li>
                <li>
                  Have professional indemnity insurance appropriate to your business
                  activities.
                </li>
                <li>
                  Provide accurate information about your fee structure, areas of
                  specialisation, and investment focus.
                </li>
                <li>
                  Comply with all applicable state-based real estate legislation,
                  including the Property and Stock Agents Act 2002 (NSW), Estate
                  Agents Act 1980 (VIC), Property Occupations Act 2014 (QLD),
                  and equivalent legislation in other states.
                </li>
              </ul>
            </S>

            <S n={5} title="Lead Handling &amp; Privacy">
              <p>
                Consumer enquiry leads delivered to you via {SITE_NAME} must be
                handled in accordance with:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  The <strong>Privacy Act 1988 (Cth)</strong> and the Australian Privacy
                  Principles — you must have a privacy policy that covers how you handle
                  personal information received from us.
                </li>
                <li>
                  The <strong>Spam Act 2003 (Cth)</strong> — you may only contact leads
                  for the purpose of the enquiry they submitted. You must not add leads
                  to marketing lists without separate express consent.
                </li>
                <li>
                  Leads must only be used to respond to the specific enquiry submitted.
                  Sharing, selling, or licensing lead data to any third party is strictly
                  prohibited.
                </li>
                <li>
                  You must respond to leads within 2 business days. Persistent
                  non-response may result in suspension from the platform.
                </li>
              </ul>
            </S>

            <S n={6} title="Fees &amp; Billing">
              <p>
                Listing fees, lead fees, and any promotional placement fees will be
                set out in a separate fee schedule agreed between you and {SITE_NAME}.
                We reserve the right to vary our fee schedule on 30 days&apos; written
                notice. Fees are exclusive of GST unless otherwise stated.
              </p>
              <p>
                <strong>No AFSL required for fees:</strong> Lead fees paid to us are
                commercial referral fees between businesses and do not constitute
                conflicted remuneration under the Future of Financial Advice (FOFA)
                reforms, as we are not a financial services provider.
              </p>
            </S>

            <S n={7} title="Content Standards">
              <p>
                All listing content, profile information, and marketing material you
                provide must:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Be accurate and not misleading or deceptive under the Australian
                  Consumer Law (ACL), including sections 18 and 29 of the Competition
                  and Consumer Act 2010 (Cth).
                </li>
                <li>
                  Comply with the Australian Competition and Consumer Commission (ACCC)
                  guidelines on property advertising.
                </li>
                <li>
                  Not make unsupported claims about investment returns, capital growth,
                  or rental yields without appropriate qualification and data sources.
                </li>
                <li>
                  Include all material information required by applicable state disclosure
                  laws (e.g. vendor disclosure statements, off-the-plan contract
                  requirements).
                </li>
              </ul>
              <p>
                We reserve the right to edit, remove, or reject any listing content
                that does not meet these standards, without liability.
              </p>
            </S>

            <S n={8} title="Sponsored Listings">
              <p>
                Sponsored or &quot;Featured&quot; placements are disclosed to consumers
                as paid placements. Sponsored status does not affect the independent
                editorial assessment of any listing. We will not remove or alter our
                disclaimer disclosures as a condition of any commercial arrangement.
              </p>
            </S>

            <S n={9} title="Warranties">
              <p>You warrant and represent that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You hold all licences, registrations, and authorisations required to conduct your business.</li>
                <li>All information you provide to us is accurate, complete, and not misleading.</li>
                <li>You have the legal right to list the properties or services you advertise on our platform.</li>
                <li>You will comply with all applicable Australian laws and regulations.</li>
              </ul>
            </S>

            <S n={10} title="Indemnity">
              <p>
                You indemnify {COMPANY_LEGAL_NAME} against any claims, losses, damages,
                costs (including legal costs on a solicitor-client basis), and expenses
                arising from or in connection with:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Any breach of these Terms by you</li>
                <li>Any inaccurate, misleading, or unlawful listing content you provide</li>
                <li>Any claim by a consumer arising from your handling of a lead</li>
                <li>Any breach of privacy or spam laws in connection with lead data</li>
              </ul>
            </S>

            <S n={11} title="Termination">
              <p>
                Either party may terminate this agreement on 14 days&apos; written notice.
                We may suspend or immediately terminate your listing if you:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Breach any of these Terms</li>
                <li>Have your real estate licence suspended or cancelled</li>
                <li>Engage in misleading or deceptive conduct</li>
                <li>Receive repeated consumer complaints substantiated by us</li>
              </ul>
              <p>
                Upon termination, your listing will be removed from the site. Lead data
                already delivered to you remains subject to the obligations in Section 5.
              </p>
            </S>

            <S n={12} title="Limitation of Liability">
              <p>
                To the maximum extent permitted by law, our liability to you is limited
                to the fees paid to us in the 3 months preceding the claim. We are not
                liable for any indirect, consequential, or special loss.
              </p>
              <p>
                Nothing in this agreement excludes liability that cannot be excluded
                under the Australian Consumer Law.
              </p>
            </S>

            <S n={13} title="Governing Law &amp; Disputes">
              <p>
                This agreement is governed by the laws of the State of Victoria,
                Australia. Any dispute must first be referred to good faith negotiation.
                If unresolved within 30 days, either party may seek resolution through
                the courts of Victoria.
              </p>
            </S>

            <S n={14} title="Contact">
              <p>
                Questions about these terms or your listing? Email us at{" "}
                <a href="mailto:partners@invest.com.au" className="underline hover:text-slate-900">
                  partners@invest.com.au
                </a>
                .
              </p>
              <p className="text-xs text-slate-500">
                {COMPANY_LEGAL_NAME} · ACN {COMPANY_ACN} · ABN {COMPANY_ABN}
              </p>
            </S>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 text-sm text-slate-500 justify-center">
            <Link href="/terms" className="underline hover:text-slate-700">Consumer Terms of Use</Link>
            <Link href="/advisor-terms" className="underline hover:text-slate-700">Advisor Services Agreement</Link>
            <Link href="/privacy" className="underline hover:text-slate-700">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </>
  );
}
