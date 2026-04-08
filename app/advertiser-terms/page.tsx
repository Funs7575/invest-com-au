import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
} from "@/lib/compliance";

export const metadata = {
  title: "Advertiser & Affiliate Partner Terms",
  description:
    "Terms governing commercial partnerships, affiliate arrangements, and sponsored content on Invest.com.au. Covers editorial independence, commission attribution, disclosure obligations, and GST.",
  alternates: { canonical: "/advertiser-terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Advertiser & Affiliate Partner Terms",
    description:
      "Terms governing commercial partnerships, affiliate arrangements, and sponsored content on Invest.com.au. Editorial independence maintained.",
    url: "/advertiser-terms",
    images: [
      {
        url: "/api/og?title=Advertiser+%26+Affiliate+Partner+Terms&subtitle=Editorial+Independence+%7C+Commission+Disclosure+%7C+GST&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const EFFECTIVE_DATE = "16 March 2026";
const VERSION = "1.0";

export default function AdvertiserTermsPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advertiser Terms" },
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
            <span className="text-slate-700">Advertiser Terms</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">Advertiser Terms &amp; Conditions</h1>
          <p className="text-xs text-slate-400 mb-8">Version {VERSION} — Effective {EFFECTIVE_DATE}</p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-amber-700">
              This agreement governs all commercial advertising, sponsorship, and partnership arrangements on {SITE_NAME}. By placing an advertisement or entering into a commercial partnership with us, you agree to these terms.
            </p>
          </div>

          <div className="space-y-4">
            <S n={1} title="Parties and Definitions">
              <p>This Advertiser Terms &amp; Conditions agreement (&quot;Agreement&quot;) is between {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}, ABN {COMPANY_ABN}), trading as {SITE_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;the Platform&quot;), and the entity purchasing advertising, sponsorship, or commercial placement (&quot;you&quot;, &quot;Advertiser&quot;, &quot;Partner&quot;).</p>
              <p>&quot;Advertisement&quot; means any paid placement including display ads, sponsored content, featured listings, comparison table placements, and native advertising. &quot;Campaign&quot; means an agreed set of Advertisements over a specified period. &quot;Creative&quot; means any text, images, video, or other materials provided by you for display.</p>
            </S>

            <S n={2} title="Advertising Standards">
              <p>All Advertisements must comply with Australian law, including the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010), the ASIC Act 2001 (prohibiting misleading or deceptive conduct in financial services), the Spam Act 2003, and the Privacy Act 1988.</p>
              <p>Financial product advertisements must comply with ASIC Regulatory Guide 234 (Advertising of financial products and advice services). Advertisements must not contain misleading performance claims, unbalanced risk/return statements, or unqualified guarantees of future returns.</p>
              <p>Advertisements for products that require an AFSL or Australian Credit Licence must include the relevant licence number. We will verify licence details before activating any financial product advertisement.</p>
            </S>

            <S n={3} title="Editorial Independence">
              <p>{SITE_NAME} maintains strict editorial independence. Advertising relationships do not influence our editorial content, product reviews, comparison rankings, or advisor directory listings. Our editorial team operates independently from our commercial team.</p>
              <p>All sponsored content and paid placements are clearly labelled with disclosures such as &quot;Sponsored&quot;, &quot;Paid Partner&quot;, or &quot;Advertisement&quot; in accordance with the AANA Code of Ethics and ASIC best-practice guidance on advertorials.</p>
              <p>We reserve the right to decline, modify, or remove any Advertisement that we believe could compromise editorial trust, mislead consumers, or conflict with our <Link href="/editorial-policy" className="text-slate-700 underline hover:text-slate-900">editorial policy</Link>.</p>
            </S>

            <S n={4} title="Creative Requirements and Approval">
              <p>All Creative must be submitted for review and approval before publication. We require a minimum of 5 business days to review Creative for compliance, accuracy, and editorial fit. We may request modifications to ensure compliance with these terms and applicable law.</p>
              <p>You are responsible for ensuring all Creative is accurate, not misleading, compliant with applicable law, and does not infringe any third-party intellectual property rights. You warrant that you have all necessary rights, licences, and permissions to use any Creative submitted to us.</p>
              <p>Creative specifications (dimensions, file formats, character limits) are provided separately and may be updated from time to time. We are not responsible for errors caused by Creative that does not meet published specifications.</p>
            </S>

            <S n={5} title="Fees, Payment, and Cancellation">
              <p>Advertising fees are as set out in the insertion order, media plan, or written agreement between the parties. Payment terms are 14 days from invoice date unless otherwise agreed in writing.</p>
              <p>Campaigns may be cancelled with 14 days&apos; written notice. Early cancellation of a committed campaign period may incur a cancellation fee of up to 50% of the remaining campaign value, as specified in the insertion order.</p>
              <p>We reserve the right to suspend Advertisements if payment is overdue by more than 14 days. Interest may be charged on overdue amounts at the rate prescribed under the Penalty Interest Rates Act 1983 (Vic).</p>
            </S>

            <S n={6} title="Reporting and Performance">
              <p>We provide standard reporting on impressions, clicks, and other agreed metrics. Reports are typically available within 5 business days of the reporting period end. We use industry-standard measurement tools and methodologies.</p>
              <p>We do not guarantee specific performance outcomes (click-through rates, conversions, leads) unless explicitly stated in a performance-based agreement. Estimated traffic and impression figures are indicative only and do not constitute a guarantee.</p>
            </S>

            <S n={7} title="Affiliate and Referral Partnerships">
              <p>Where we participate in affiliate or referral programs, we disclose this relationship to consumers. Affiliate commissions do not influence our editorial rankings or product ratings — our methodology is published in our <Link href="/editorial-policy" className="text-slate-700 underline hover:text-slate-900">editorial policy</Link>.</p>
              <p>Affiliate tracking, attribution windows, and commission structures are as agreed in the partnership agreement. We reserve the right to end affiliate partnerships with 30 days&apos; notice if the partner product no longer meets our editorial standards or regulatory requirements.</p>
            </S>

            <S n={8} title="Data and Privacy">
              <p>We collect and handle all data in accordance with our <Link href="/privacy" className="text-slate-700 underline hover:text-slate-900">Privacy Policy</Link> and the Privacy Act 1988. We do not share personally identifiable user data with Advertisers without explicit user consent.</p>
              <p>Any audience targeting, retargeting, or tracking technologies used in connection with Advertisements must comply with applicable privacy laws and our platform data policies. Third-party tracking pixels require prior written approval.</p>
            </S>

            <S n={9} title="Intellectual Property">
              <p>You retain ownership of your Creative. By submitting Creative to us, you grant {COMPANY_LEGAL_NAME} a non-exclusive, royalty-free licence to display, reproduce, and distribute the Creative for the purpose of fulfilling the advertising Campaign.</p>
              <p>This licence extends to our website, email newsletters, social media channels, and any other distribution channels agreed in the Campaign. The licence terminates upon Campaign completion and removal of the Creative, except for archived or cached versions.</p>
              <p>You must not use {SITE_NAME}&apos;s brand, logo, or editorial content in your own marketing without prior written approval.</p>
            </S>

            <S n={10} title="Indemnification">
              <p>You indemnify {COMPANY_LEGAL_NAME}, its directors, officers, employees, and agents against any claims, damages, costs (including legal costs on a solicitor-and-own-client basis), and liabilities arising from or in connection with: (a) your Creative or Advertisements; (b) any breach of this Agreement; (c) any breach of applicable laws or regulations; or (d) any claim that your Creative infringes third-party intellectual property rights.</p>
            </S>

            <S n={11} title="Limitation of Liability">
              <p>To the maximum extent permitted by Australian law, {COMPANY_LEGAL_NAME}&apos;s total liability under this Agreement is limited to the advertising fees paid by you in the 12 months preceding the claim.</p>
              <p>We are not liable for any indirect, consequential, special, or punitive damages, including loss of revenue, loss of business opportunity, or reputational damage, even if advised of the possibility of such damages.</p>
              <p>Nothing in this Agreement excludes or limits liability that cannot be excluded under the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010).</p>
            </S>

            <S n={12} title="Termination">
              <p>Either party may terminate this Agreement with 30 days&apos; written notice. We may immediately remove Advertisements without notice if the Creative breaches these terms, applicable law, or a regulatory direction.</p>
              <p>Upon termination, all outstanding fees remain payable. Sections relating to indemnification, limitation of liability, intellectual property, and governing law survive termination.</p>
            </S>

            <S n={13} title="GST">
              <p>
                All fees and charges referred to in this Agreement are expressed exclusive of Goods and Services Tax (GST) unless otherwise stated. Where a supply under this Agreement is a taxable supply for the purposes of the A New Tax System (Goods and Services Tax) Act 1999 (Cth), the recipient will pay the GST-exclusive amount plus GST on receipt of a valid tax invoice. Both parties warrant they are registered for GST (ABN 90 093 882 421 for {COMPANY_LEGAL_NAME}).
              </p>
            </S>

            <S n={14} title="Governing Law and Disputes">
              <p>This Agreement is governed by the laws of Victoria, Australia. Each party submits to the non-exclusive jurisdiction of the courts of Victoria and any courts of appeal from them.</p>
              <p>Before commencing formal dispute resolution, the parties agree to attempt to resolve any dispute by good faith negotiation for a period of 14 business days from written notice of the dispute.</p>
            </S>

            <S n={15} title="General">
              <p>This Agreement, together with any insertion order or partnership agreement, constitutes the entire agreement between the parties regarding advertising on the Platform. We may amend these terms with 30 days&apos; notice via email. Continued advertising after the notice period constitutes acceptance of the amended terms.</p>
              <p>If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions continue in full force and effect.</p>
            </S>

            {/* Contact */}
            <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6">
              <h2 className="text-base md:text-lg font-bold text-slate-900 mb-2">16. Contact</h2>
              <p className="text-sm text-slate-600">
                For advertising enquiries or questions about this Agreement, contact us at{" "}
                <a href="mailto:advertise@invest.com.au" className="text-slate-700 underline hover:text-slate-900">advertise@invest.com.au</a>{" "}
                or email: partners@invest.com.au.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
