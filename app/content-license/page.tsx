import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
} from "@/lib/compliance";

export const metadata = {
  title: "Content Licence Agreement — Invest.com.au",
  description: "Terms governing the submission, licensing, and publication of expert content on Invest.com.au.",
  alternates: { canonical: "/content-license" },
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "10 March 2026";
const VERSION = "1.0";

export default function ContentLicensePage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Content Licence Agreement" },
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
            <span className="text-slate-700">Content Licence Agreement</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">Content Licence Agreement</h1>
          <p className="text-xs text-slate-400 mb-8">Version {VERSION} — Effective {EFFECTIVE_DATE}</p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-emerald-700">
              This agreement governs the submission, licensing, and publication of articles and other content you submit to {SITE_NAME} through the Advisor Portal. By submitting content, you agree to these terms. This agreement supplements your <Link href="/advisor-terms" className="text-emerald-800 underline hover:text-emerald-900">Advisor Services Agreement</Link>.
            </p>
          </div>

          <div className="space-y-4">
            <S n={1} title="Definitions">
              <p>&quot;Content&quot; means any articles, text, images, graphics, data, or other materials you submit to {SITE_NAME} through the Advisor Portal or any other submission mechanism. &quot;Platform&quot; means the {SITE_NAME} website, including all subdomains, apps, email newsletters, and social media channels operated by {COMPANY_LEGAL_NAME}.</p>
            </S>

            <S n={2} title="Licence Grant">
              <p>By submitting Content to the Platform, you grant {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}) a <strong>non-exclusive, royalty-free, worldwide, perpetual, irrevocable licence</strong> to:</p>
              <p>(a) publish, display, and distribute the Content on the Platform;</p>
              <p>(b) edit, adapt, reformat, and create derivative works of the Content for clarity, accuracy, compliance with applicable law, SEO optimisation, and consistency with our house style;</p>
              <p>(c) use the Content in email newsletters, social media posts, and other promotional materials for the Platform;</p>
              <p>(d) sublicense the Content to third parties for the purpose of content syndication, provided your authorship attribution is maintained.</p>
              <p>This licence is granted in consideration of the publication and promotion of your Content and your professional profile on the Platform.</p>
            </S>

            <S n={3} title="Ownership and Moral Rights">
              <p>You retain ownership of the intellectual property in your Content. This agreement does not transfer ownership — it grants a licence only.</p>
              <p>To the extent permitted by the Copyright Act 1968 (Cth), you consent to any act or omission by {COMPANY_LEGAL_NAME} that would otherwise infringe your moral rights in the Content, including the right of attribution (where we undertake to provide reasonable attribution) and the right of integrity (where edits are made in good faith for the purposes described in section 2).</p>
            </S>

            <S n={4} title="Your Warranties">
              <p>By submitting Content, you warrant and represent that:</p>
              <p>(a) the Content is your <strong>original work</strong> and has not been substantially copied from any third party;</p>
              <p>(b) the Content does not infringe the intellectual property rights, privacy rights, or any other rights of any third party;</p>
              <p>(c) the Content <strong>does not constitute personal financial advice</strong> and complies with ASIC Regulatory Guide 234 (Advertising of financial products and advice services);</p>
              <p>(d) any factual claims, statistics, tax rates, or regulatory references in the Content are <strong>accurate and current</strong> at the time of submission;</p>
              <p>(e) the Content does not contain defamatory, obscene, or otherwise unlawful material;</p>
              <p>(f) you have the full right, power, and authority to grant the licence described in section 2; and</p>
              <p>(g) the Content complies with our <Link href="/editorial-policy" className="text-slate-700 underline hover:text-slate-900">Editorial Policy</Link> and submission guidelines.</p>
            </S>

            <S n={5} title="Editorial Control">
              <p>{COMPANY_LEGAL_NAME} retains full editorial control over all Content published on the Platform. We may, at our sole discretion:</p>
              <p>(a) accept or reject any Content submission;</p>
              <p>(b) edit Content for clarity, accuracy, compliance, length, SEO, and house style;</p>
              <p>(c) request revisions before publication;</p>
              <p>(d) remove published Content at any time if it no longer meets our editorial standards, is found to contain inaccuracies, or if required by law or a regulatory authority;</p>
              <p>(e) add disclaimers, disclosures, editor&apos;s notes, or contextual links to the Content.</p>
              <p>We will make reasonable efforts to notify you of material editorial changes, but are not obliged to seek your approval for every edit.</p>
            </S>

            <S n={6} title="Attribution">
              <p>Published Content will include attribution to you by name and professional title, with a link to your advisor profile on the Platform. We may also display your firm name, professional photo, and verification status alongside your Content.</p>
              <p>You agree that this attribution constitutes reasonable acknowledgement of your authorship for the purposes of the Copyright Act 1968.</p>
            </S>

            <S n={7} title="Publication Fees">
              <p>Where applicable, publication fees are as described in the Advisor Portal at the time of submission. Fees vary by publication tier (Free, Standard, Premium) and are collected after editorial approval and before publication.</p>
              <p>If Content is rejected or you withdraw your submission before publication, no publication fee is charged. Fees paid for published Content are non-refundable, except where we materially fail to publish the Content or remove it within 30 days of publication for reasons other than regulatory compliance.</p>
            </S>

            <S n={8} title="Take-Down and Removal">
              <p>You may request removal of your published Content by emailing <a href="mailto:content@invest.com.au" className="text-slate-700 underline hover:text-slate-900">content@invest.com.au</a>. We will remove the Content within 14 business days of receiving a valid request, subject to the following:</p>
              <p>(a) the licence granted in section 2 survives removal for any Content that has been syndicated, cached, archived, or incorporated into derivative works prior to the removal date;</p>
              <p>(b) we may retain a non-public archival copy for legal and audit purposes;</p>
              <p>(c) publication fees are not refunded upon Content removal requested by you.</p>
              <p>We may remove Content immediately without notice if required by law, by a court order, or by a regulatory authority such as ASIC.</p>
            </S>

            <S n={9} title="Indemnification">
              <p>You indemnify {COMPANY_LEGAL_NAME}, its directors, officers, employees, and agents against any claims, damages, costs (including legal costs), and liabilities arising from or in connection with: (a) any breach of the warranties in section 4; (b) any infringement of third-party intellectual property rights in your Content; or (c) any regulatory action arising from the content of your submissions.</p>
            </S>

            <S n={10} title="Limitation of Liability">
              <p>To the maximum extent permitted by Australian law, {COMPANY_LEGAL_NAME}&apos;s total liability to you under this agreement is limited to the publication fees (if any) paid by you for the specific Content in question.</p>
              <p>We are not liable for any loss of business, loss of clients, or reputational damage arising from the publication, editing, or removal of your Content.</p>
            </S>

            <S n={11} title="Term and Termination">
              <p>This agreement applies to each item of Content you submit and remains in effect for the duration of the licence granted in section 2.</p>
              <p>If your <Link href="/advisor-terms" className="text-slate-700 underline hover:text-slate-900">Advisor Services Agreement</Link> is terminated, this Content Licence Agreement remains in effect for any Content already published. You may not submit new Content after termination of your Advisor Services Agreement.</p>
            </S>

            <S n={12} title="Governing Law">
              <p>This agreement is governed by the laws of Victoria, Australia. Each party submits to the non-exclusive jurisdiction of the courts of Victoria and any courts of appeal from them.</p>
            </S>

            <S n={13} title="Contact">
              <p>
                For questions about this agreement or Content submissions, contact us at{" "}
                <a href="mailto:content@invest.com.au" className="text-slate-700 underline hover:text-slate-900">content@invest.com.au</a>.
              </p>
            </S>
          </div>
        </div>
      </div>
    </>
  );
}
