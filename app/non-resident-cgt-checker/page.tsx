import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";
import NonResidentCgtClient from "./NonResidentCgtClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Non-Resident CGT Checker (${CURRENT_YEAR}) — Section 855-10 Eligibility`,
  description:
    "Interactive check: does the Australian CGT exemption for non-residents apply to your asset? Covers listed shares, direct mining, real property, and the Taxable Australian Property tests.",
  alternates: { canonical: "/non-resident-cgt-checker" },
  openGraph: {
    title: `Non-Resident CGT Checker (${CURRENT_YEAR})`,
    description:
      "Check if Section 855-10 CGT exemption applies to your Australian investment.",
    url: absoluteUrl("/non-resident-cgt-checker"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Non-Resident CGT Checker — ${SITE_NAME}`,
  description:
    "Interactive decision tool for Section 855-10 portfolio CGT exemption eligibility for non-resident Australian investors.",
  url: absoluteUrl("/non-resident-cgt-checker"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
  {
    name: "Non-Resident CGT Checker",
    url: absoluteUrl("/non-resident-cgt-checker"),
  },
]);

const faqLd = faqJsonLd([
  {
    q: "Does Australia tax non-residents on capital gains?",
    a: "Section 855-10 of the ITAA 1997 exempts non-residents from Australian CGT on assets that are not Taxable Australian Property (TAP). Portfolio assets such as listed shares and ETFs in non-land-rich companies are generally exempt. However, direct real property, mining and exploration rights, and indirect interests in land-rich entities remain taxable regardless of the seller's residency.",
  },
  {
    q: "What is Taxable Australian Property (TAP)?",
    a: "TAP includes: (1) direct real property situated in Australia; (2) indirect interests where the underlying assets are at least 50% Australian land value — the land-rich test; (3) mining, quarrying and exploration rights in Australia; (4) assets used in carrying on a business through an Australian permanent establishment; and (5) assets over which a non-resident has made a TAP election under s855-20. Assets that fall within TAP remain subject to Australian CGT even for non-residents.",
  },
  {
    q: "Are Australian shares CGT-exempt for non-residents?",
    a: "Generally yes. Listed shares in a company that does not hold 50% or more of its assets in Australian real property are portfolio assets and fall outside TAP, so any capital gain is exempt under s855-10. The exemption does not apply if the company is land-rich (e.g., a listed property trust or mining company with significant Australian assets), or if the non-resident holds a 10% or greater direct interest in such an entity.",
  },
  {
    q: "Do I need a clearance certificate when selling Australian property as a non-resident?",
    a: "Yes. Under the foreign resident capital gains withholding rules, buyers of Australian real property with a market value of $750,000 or more must withhold 12.5% of the purchase price and remit it to the ATO unless the vendor provides a valid ATO clearance certificate before settlement. Australian resident sellers obtain the certificate to confirm they are not a foreign resident; non-resident sellers can apply for a variation if the actual CGT liability is less than the 12.5% withholding amount.",
  },
  {
    q: "Can a non-resident make a TAP election for shares?",
    a: "Yes. Under s855-20, a non-resident may elect to treat shares in an Australian company as TAP even if they would otherwise be exempt portfolio assets. The election is irrevocable for the life of ownership. Making the election brings the shares into the Australian CGT system, which allows the non-resident to access capital losses against those shares (which would otherwise be disregarded under s855-10). The election is typically used where a non-resident expects losses rather than gains.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Non-Resident CGT Checker",
  path: "/non-resident-cgt-checker",
  selectors: ["h1", ".cgt-result-heading"],
});

function Loading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-4 w-48 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function NonResidentCgtCheckerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }}
      />
      <Suspense fallback={<Loading />}>
        <NonResidentCgtClient />
      </Suspense>
      <div className="container-custom pb-8">
        <CalcToPlanBridge
          goal="expat_investing"
          headline="Want help with your non-resident tax position?"
          subtitle="We'll match you with verified Australian tax agents who specialise in non-resident CGT and investment returns."
        />
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
