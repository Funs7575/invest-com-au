import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";

export const metadata = {
  title: "Advisor Services Agreement — Invest.com.au",
  description:
    "Terms and conditions for financial advisors, accountants, and mortgage brokers listed on the Invest.com.au directory. Covers eligibility, lead handling, billing, auto-renewal, and compliance obligations.",
  alternates: { canonical: "/advisor-terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Advisor Services Agreement — Invest.com.au",
    description:
      "Terms for financial professionals listed on Invest.com.au. Covers eligibility, lead handling, billing, and compliance obligations.",
    url: "/advisor-terms",
    images: [
      {
        url: "/api/og?title=Advisor+Services+Agreement&subtitle=Listing+Terms+for+Financial+Professionals&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const EFFECTIVE_DATE = "10 March 2026";
const VERSION = "1.0";

export default function AdvisorTermsPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advisor Services Agreement" },
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
            <span className="text-slate-700">Advisor Services Agreement</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">Advisor Services Agreement</h1>
          <p className="text-xs text-slate-400 mb-8">Version {VERSION} — Effective {EFFECTIVE_DATE}</p>

          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-violet-700">
              This agreement governs your participation as a listed professional on {SITE_NAME}. By applying for or maintaining a listing, you agree to these terms. If you do not agree, do not submit an application or maintain a listing.
            </p>
          </div>

          <div className="space-y-4">
            <S n={1} title="Parties and Definitions">
              <p>This Advisor Services Agreement (&quot;Agreement&quot;) is between {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}, ABN {COMPANY_ABN}), trading as {SITE_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;the Platform&quot;), and you, the financial professional or firm applying for or maintaining a listing on our advisor directory (&quot;you&quot;, &quot;Advisor&quot;, &quot;Professional&quot;).</p>
              <p>&quot;Listing&quot; means your professional profile page on {SITE_NAME}. &quot;Content&quot; means any articles, text, images, or other materials you submit. &quot;Lead&quot; means an enquiry or booking from a consumer directed to you through the Platform.</p>
            </S>

            <S n={2} title="Eligibility and Verification">
              <p>To be listed on {SITE_NAME}, you must hold and maintain a current Australian Financial Services Licence (AFSL), be an authorised representative of an AFSL holder, or hold equivalent registration required for your professional type (e.g., registered tax agent, licensed mortgage broker).</p>
              <p>You must provide accurate registration and licence details during your application. We will verify these details with ASIC, the Tax Practitioners Board, or other relevant registries before activating your listing. You must notify us within 7 business days of any change to your registration status, licence conditions, or disciplinary actions.</p>
              <p>We reserve the right to refuse, suspend, or remove any listing at our sole discretion, including but not limited to cases where your licence is suspended, cancelled, or subject to ASIC conditions.</p>
            </S>

            <S n={3} title="Listing Obligations">
              <p>You agree that all information provided in your listing profile is accurate, current, and not misleading. This includes your name, firm name, qualifications, specialties, fee structure, AFSL number, ABN, and any other details you provide.</p>
              <p>You must update your listing details within 14 days of any material change. If we identify inaccurate information, we may suspend your listing until corrections are made.</p>
              <p>Your listing must not contain any claims that contravene ASIC Regulatory Guide 234 (Advertising of financial products and advice services), including misleading performance claims, unqualified testimonials, or unsubstantiated statements.</p>
            </S>

            <S n={4} title="Lead Handling and Consumer Protection">
              <p>When you receive a Lead through the Platform, you must respond within 2 business days and conduct yourself in accordance with your AFSL obligations, the Corporations Act 2001, and any applicable codes of conduct.</p>
              <p>You must provide a Financial Services Guide (FSG) to any consumer before providing personal financial advice. You must clearly distinguish between general and personal advice in all communications.</p>
              <p>You must not misrepresent your relationship with {SITE_NAME}. You are an independent professional, not an employee, agent, or representative of {SITE_NAME}.</p>
            </S>

            <S n={5} title="Fees, Billing, and Disputes">
              <p>Listing fees, per-lead fees, article publication fees, and any other charges are as set out in your portal dashboard or as separately agreed in writing. All fees are in Australian dollars and are exclusive of Goods and Services Tax (GST). GST will be added where applicable and is your responsibility as the recipient of the taxable supply. We will provide a valid tax invoice for all charges. We may change fees with 30 days&apos; written notice.</p>
              <p><strong>Subscription auto-renewal:</strong> Paid advisor subscription plans (Basic, Professional, Premium) renew automatically at the end of each billing period (monthly or annual). You authorise us to charge your nominated payment method on each renewal date. You may cancel at any time via your advisor portal; cancellation takes effect at the end of the current billing period and access continues until then.</p>
              <p><strong>Refunds:</strong> If you cancel your subscription within 7 days of the initial purchase date, you may request a full refund of the first payment. Refunds are not available for renewals or after the 7-day window, except where required by the Australian Consumer Law. To request a refund, contact <a href="mailto:partners@invest.com.au" className="underline hover:text-slate-900">partners@invest.com.au</a>.</p>
              <p>Lead disputes must be submitted within 14 days of the lead being delivered. A valid dispute is one where the lead contains demonstrably invalid contact information, the enquiry is clearly unrelated to financial services, or the same lead was delivered as a duplicate. We will review disputes within 10 business days and either credit or decline the dispute at our reasonable discretion.</p>
              <p>Overdue payments may result in listing suspension. We reserve the right to charge interest on overdue amounts at the rate prescribed under the Penalty Interest Rates Act 1983 (Vic).</p>
            </S>

            <S n={6} title="Content Licence and Article Submissions">
              <p>By submitting any Content to {SITE_NAME} (including articles, profile text, and images), you grant us a non-exclusive, royalty-free, worldwide, perpetual licence to publish, edit, adapt, and distribute that Content on the Platform and in promotional materials.</p>
              <p>You retain ownership of your Content but acknowledge our right to edit for clarity, accuracy, compliance, and house style. You warrant that all Content you submit is original, does not infringe any third-party intellectual property rights, and complies with our editorial guidelines and applicable law.</p>
              <p>We may remove Content at any time if, in our reasonable opinion, it breaches these terms, our editorial guidelines, or applicable financial services regulations. For full Content guidelines, see our <Link href="/editorial-policy" className="text-slate-700 underline hover:text-slate-900">editorial policy</Link>.</p>
            </S>

            <S n={7} title="Compliance and Regulatory Obligations">
              <p>You are solely responsible for your own regulatory compliance, including compliance with the Corporations Act 2001, ASIC regulatory guides, the Privacy Act 1988, the Spam Act 2003, and any industry codes of conduct.</p>
              <p>{SITE_NAME} is not a financial product issuer, credit provider, or financial adviser. We provide a directory and comparison platform only. We do not supervise, endorse, or take responsibility for the financial advice you provide to consumers.</p>
              <p>If we become aware that you are in breach of your regulatory obligations, we may immediately suspend or remove your listing and notify the relevant regulator where required by law.</p>
            </S>

            <S n={8} title="Indemnification">
              <p>You indemnify {COMPANY_LEGAL_NAME}, its directors, officers, employees, and agents against any claims, damages, costs (including legal costs on a solicitor-and-own-client basis), and liabilities arising from or in connection with: (a) your breach of this Agreement; (b) any financial advice or services you provide to consumers sourced through the Platform; (c) any Content you submit; or (d) any breach of applicable laws or regulations.</p>
            </S>

            <S n={9} title="Limitation of Liability">
              <p>To the maximum extent permitted by Australian law, {COMPANY_LEGAL_NAME}&apos;s total liability under or in connection with this Agreement is limited to the fees paid by you in the 12 months preceding the claim.</p>
              <p>We are not liable for any indirect, consequential, special, or punitive damages, including loss of revenue, loss of clients, or loss of business opportunity, even if advised of the possibility of such damages.</p>
              <p>Nothing in this Agreement excludes or limits liability that cannot be excluded under the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010).</p>
            </S>

            <S n={10} title="Suspension and Termination">
              <p>Either party may terminate this Agreement with 30 days&apos; written notice. We may immediately suspend or terminate your listing without notice if you breach this Agreement, if your professional registration is suspended or cancelled, or if required by law or a regulator.</p>
              <p>Upon termination, your listing will be deactivated. Any outstanding fees remain payable. The content licence granted under section 6 survives termination for Content already published.</p>
            </S>

            <S n={11} title="Privacy and Data">
              <p>We collect and handle personal information in accordance with our <Link href="/privacy" className="text-slate-700 underline hover:text-slate-900">Privacy Policy</Link> and the Privacy Act 1988. By accepting this Agreement, you consent to the collection, use, and disclosure of your personal and professional information as described in our Privacy Policy.</p>
              <p>Consumer lead data is provided to you for the sole purpose of responding to their enquiry. You must handle lead data in accordance with the Privacy Act 1988 and must not use it for any purpose other than responding to the specific enquiry, unless the consumer provides separate consent.</p>
            </S>

            <S n={12} title="Governing Law and Disputes">
              <p>This Agreement is governed by the laws of Victoria, Australia. Each party submits to the non-exclusive jurisdiction of the courts of Victoria and any courts of appeal from them.</p>
              <p>Before commencing formal dispute resolution, the parties agree to attempt to resolve any dispute by good faith negotiation for a period of 14 business days from written notice of the dispute.</p>
            </S>

            <S n={13} title="General">
              <p>This Agreement constitutes the entire agreement between the parties regarding your participation on the Platform. We may amend these terms with 30 days&apos; notice via email to the address on your listing. Continued use of the Platform after the notice period constitutes acceptance of the amended terms.</p>
              <p>If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions continue in full force and effect.</p>
            </S>

            {/* Contact */}
            <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6">
              <h2 className="text-base md:text-lg font-bold text-slate-900 mb-2">14. Contact</h2>
              <p className="text-sm text-slate-600">
                For questions about this Agreement, contact us at{" "}
                <a href="mailto:legal@invest.com.au" className="text-slate-700 underline hover:text-slate-900">legal@invest.com.au</a>{" "}
                or email: partners@invest.com.au.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
