import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
} from "@/lib/compliance";

export const revalidate = 86400;

export const metadata = {
  title: "Advertising & Listing Terms",
  description: "Terms and conditions for brokers and financial product issuers advertising or listed on Invest.com.au.",
  alternates: { canonical: "/broker-terms" },
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "10 March 2026";
const VERSION = "1.0";

export default function BrokerTermsPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advertising & Listing Terms" },
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
            <span className="text-slate-700">Advertising &amp; Listing Terms</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">Advertising &amp; Listing Terms</h1>
          <p className="text-xs text-slate-400 mb-8">Version {VERSION} — Effective {EFFECTIVE_DATE}</p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-700">
              This agreement governs the listing and advertising of financial products and services on {SITE_NAME}. By registering for a broker portal account or purchasing advertising, you agree to these terms.
            </p>
          </div>

          <div className="space-y-4">
            <S n={1} title="Parties and Definitions">
              <p>This Advertising &amp; Listing Terms agreement (&quot;Agreement&quot;) is between {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}, ABN {COMPANY_ABN}), trading as {SITE_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;Publisher&quot;), and the entity registering for advertising services (&quot;you&quot;, &quot;Advertiser&quot;, &quot;Broker&quot;).</p>
              <p>&quot;Listing&quot; means the product review and comparison entry on our site. &quot;Campaign&quot; means a paid advertising placement (CPC, CPM, sponsorship, or featured placement). &quot;Creative&quot; means any advertising copy, logos, images, or materials you provide.</p>
            </S>

            <S n={2} title="Eligibility">
              <p>Advertisers must hold appropriate licences to offer the financial products or services being advertised in Australia. For brokers and trading platforms, this means holding an AFSL or being an authorised representative of an AFSL holder. For credit products, an Australian Credit Licence (ACL) is required.</p>
              <p>You warrant that all financial products and services advertised through {SITE_NAME} are lawfully offered in Australia and comply with ASIC product intervention orders, design and distribution obligations (DDO), and all other applicable regulations.</p>
            </S>

            <S n={3} title="Editorial Independence">
              <p>{SITE_NAME} maintains complete editorial independence. Advertising and commercial relationships do not influence our editorial ratings, review methodology, or the content of our comparison tables.</p>
              <p>You acknowledge and agree that: (a) paid placements are clearly disclosed to consumers; (b) editorial ratings are determined independently; (c) we may publish unfavourable reviews or ratings of your products; (d) you have no right to approve, edit, or suppress editorial content about your products.</p>
            </S>

            <S n={4} title="Advertising Content and Compliance">
              <p>All Creatives and advertising claims must comply with ASIC Regulatory Guide 234 (Advertising of financial products and advice services), the Australian Consumer Law, and any applicable industry codes.</p>
              <p>You must not provide Creatives that contain misleading or deceptive claims, unsubstantiated performance promises, comparisons that are not fair and balanced, or claims that contravene any ASIC product intervention order.</p>
              <p>We reserve the right to reject, modify, or remove any Creative that, in our reasonable opinion, does not comply with applicable regulations or our advertising standards. We are not responsible for reviewing the regulatory compliance of your Creatives — that obligation rests with you.</p>
            </S>

            <S n={5} title="Campaign Pricing and Payment">
              <p>Campaign pricing is as set out in your portal dashboard or as separately agreed in writing. We offer cost-per-click (CPC), cost-per-impression (CPM), and sponsorship-based pricing models.</p>
              <p>Campaigns are funded from your wallet balance. You must maintain a positive wallet balance for active campaigns. Campaigns will be paused automatically if your balance reaches zero.</p>
              <p>All prices are in Australian dollars and exclusive of GST. We will issue valid tax invoices for all charges. Payment terms are as specified in the relevant invoice.</p>
              <p>Refunds for campaign spend are not available except where we have materially failed to deliver the agreed impressions or clicks, or where fraudulent click activity is identified by our tracking systems.</p>
            </S>

            <S n={6} title="Data, Tracking, and Reporting">
              <p>We provide campaign performance reporting through the broker portal, including impressions, clicks, conversions, and spend data. While we use commercially reasonable efforts to ensure accuracy, reporting figures are estimates and may not perfectly match your internal tracking.</p>
              <p>We track user interactions using cookies and analytics tools as described in our <Link href="/privacy" className="text-slate-700 underline hover:text-slate-900">Privacy Policy</Link>. You agree to comply with the Privacy Act 1988 in your handling of any data derived from your campaigns.</p>
              <p>Conversion tracking via webhooks or postbacks is available. You are responsible for the security of your API keys and webhook endpoints.</p>
            </S>

            <S n={7} title="Intellectual Property">
              <p>You grant us a non-exclusive, royalty-free licence to use your brand name, logos, product descriptions, and other Creatives for the purpose of displaying your advertising and listing on {SITE_NAME}.</p>
              <p>We retain all rights to our website content, comparison methodology, editorial content, and proprietary technology. You must not scrape, reproduce, or create derivative works from our content without written permission.</p>
            </S>

            <S n={8} title="Indemnification">
              <p>You indemnify {COMPANY_LEGAL_NAME}, its directors, officers, employees, and agents against any claims, damages, costs, and liabilities arising from: (a) your breach of this Agreement; (b) your advertising content or Creatives; (c) your financial products or services; (d) any regulatory action arising from your products or advertising; or (e) any breach of applicable laws.</p>
            </S>

            <S n={9} title="Limitation of Liability">
              <p>To the maximum extent permitted by Australian law, {COMPANY_LEGAL_NAME}&apos;s total liability under this Agreement is limited to the advertising fees paid by you in the 6 months preceding the claim.</p>
              <p>We are not liable for any loss of revenue, loss of customers, or loss of business opportunity arising from the display (or non-display) of your advertising, changes to your listing position, or editorial content about your products.</p>
              <p>Nothing in this Agreement excludes liability that cannot be excluded under the Australian Consumer Law.</p>
            </S>

            <S n={10} title="Suspension and Termination">
              <p>Either party may terminate this Agreement with 30 days&apos; written notice. We may immediately suspend your advertising or listing if you breach this Agreement, if your AFSL is suspended or cancelled, if required by law or a regulator, or if your advertising content violates our policies.</p>
              <p>Upon termination, active campaigns will cease. Any remaining wallet balance (minus outstanding fees) will be refunded within 30 business days. The intellectual property licence granted under section 7 ceases on termination.</p>
            </S>

            <S n={11} title="Governing Law">
              <p>This Agreement is governed by the laws of Victoria, Australia. Each party submits to the non-exclusive jurisdiction of the courts of Victoria.</p>
            </S>

            <S n={12} title="Contact">
              <p>
                For questions about this Agreement, contact us at{" "}
                <a href="mailto:partnerships@invest.com.au" className="text-slate-700 underline hover:text-slate-900">partnerships@invest.com.au</a>{" "}
                or email: partners@invest.com.au.
              </p>
            </S>
          </div>
        </div>
      </div>
    </>
  );
}
