import Link from "next/link";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
  AFSL_STATUS_DISCLOSURE,
  FSG_NOTE,
} from "@/lib/compliance";

export const metadata = {
  title: "Financial Services Guide",
  description:
    "Why Invest.com.au does not issue a Financial Services Guide, and what this means for you as a user of our information service.",
  alternates: { canonical: "/fsg" },
};

export default function FSGPage() {
  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700">Financial Services Guide</span>
        </div>

        <h1 className="text-2xl md:text-4xl font-extrabold mb-2">
          Financial Services Guide
        </h1>
        <p className="text-xs text-slate-400 mb-8">Last updated: 18 March 2026</p>

        {/* Key callout */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">We do not issue a Financial Services Guide</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}) does not hold an Australian
                Financial Services Licence (AFSL) and does not provide financial product
                advice. We operate as a factual comparison and directory service under the
                s766B(6)/(7) factual information carve-outs of the Corporations Act 2001.
                We are not required to issue an FSG.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">What is a Financial Services Guide?</h2>
            <p>
              A Financial Services Guide (FSG) is a document that Australian Financial
              Services Licence (AFSL) holders are required to give to retail clients
              before providing financial services. An FSG describes:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>What financial services the licensee provides</li>
              <li>How the licensee is remunerated</li>
              <li>The licensee&apos;s dispute resolution process</li>
              <li>How to contact the licensee</li>
            </ul>
            <p className="mt-2">
              The obligation to provide an FSG arises under section 941A of the
              Corporations Act 2001 (Cth) and applies to holders of an AFSL.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Why We Don&apos;t Issue One</h2>
            <p>
              {AFSL_STATUS_DISCLOSURE}
            </p>
            <p className="mt-2">
              Because we do not hold an AFSL, we are not required to issue an FSG to
              users. Our site operates as a general information and comparison service.
              We do not:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide personal financial advice tailored to your individual circumstances</li>
              <li>Issue, arrange, or deal in financial products</li>
              <li>Operate as a licensed mortgage broker or credit representative</li>
              <li>Hold client money or assets</li>
            </ul>
            <p className="mt-2">
              Our directory allows users to browse and contact licensed professionals
              directly. This is a directory and referral service, not financial product
              advice. Listed advisors are independent professionals who hold their own
              AFSL or operate under an AFSL.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">What You Should Request From Providers</h2>
            <p>{FSG_NOTE}</p>
            <p className="mt-2">
              When engaging with any financial adviser, mortgage broker, or financial
              product provider introduced through this site, you should:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Request their FSG</strong> — which details their services,
                fees, and how they are remunerated
              </li>
              <li>
                <strong>Request a Statement of Advice (SOA)</strong> if they provide
                you with personal financial advice
              </li>
              <li>
                <strong>Verify their AFSL</strong> — check the ASIC Professional
                Registers at{" "}
                <a
                  href="https://moneysmart.gov.au/financial-advice/financial-advisers-register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-slate-900"
                >
                  moneysmart.gov.au
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">How We Are Remunerated</h2>
            <p>
              Advertising and referral fees may be received from some listed businesses.
              Promoted placements are clearly labelled. Directory entries and factual data
              fields are displayed separately from advertisements. We disclose our
              commercial relationships on every page of the site and in our{" "}
              <Link href="/how-we-earn" className="underline hover:text-slate-900">
                How We Earn
              </Link>{" "}
              page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Complaints &amp; Disputes</h2>
            <p>
              If you have a concern about how we have handled your information or enquiry,
              contact us at{" "}
              <a href="mailto:hello@invest.com.au" className="underline hover:text-slate-900">
                hello@invest.com.au
              </a>
              . We aim to respond within 5 business days.
            </p>
            <p className="mt-2">
              If you have a complaint about a financial product, service, or advice
              provided by a licensed professional you found through this site, contact
              that provider directly. If unresolved, you can lodge a complaint with the{" "}
              <a
                href="https://www.afca.org.au"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-900"
              >
                Australian Financial Complaints Authority (AFCA)
              </a>{" "}
              at 1800 931 678 or afca.org.au.
            </p>
            <p className="mt-2">
              See our <Link href="/complaints" className="underline hover:text-slate-900">Complaints page</Link> for full details.
            </p>
          </section>

          <section className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h2 className="text-base font-bold text-slate-900 mb-2">Company Details</h2>
            <p>{COMPANY_LEGAL_NAME}</p>
            <p>ACN {COMPANY_ACN} · ABN {COMPANY_ABN}</p>
            <p>
              Email:{" "}
              <a href="mailto:hello@invest.com.au" className="underline hover:text-slate-900">
                hello@invest.com.au
              </a>
            </p>
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-3 text-xs">
              <Link href="/terms" className="underline hover:text-slate-900">Terms of Use</Link>
              <Link href="/privacy" className="underline hover:text-slate-900">Privacy Policy</Link>
              <Link href="/how-we-earn" className="underline hover:text-slate-900">How We Earn</Link>
              <Link href="/complaints" className="underline hover:text-slate-900">Complaints</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
