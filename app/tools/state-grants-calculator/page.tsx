import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import StateGrantsCalculatorClient from "./StateGrantsCalculatorClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `State Grants Calculator (${CURRENT_YEAR}) — First Home Owner Grant by State`,
  description:
    "See your state's First Home Owner Grant amount, stamp-duty concession, and First Home Guarantee eligibility in one place. Covers NSW, VIC, QLD, WA, SA, TAS, ACT and NT — federal and state levers stacked.",
  alternates: { canonical: `${SITE_URL}/tools/state-grants-calculator` },
  openGraph: {
    title: `First Home Owner Grant Calculator by State (${CURRENT_YEAR})`,
    description:
      "Federal First Home Guarantee + state FHOG + stamp-duty concession in one calculator.",
    url: `${SITE_URL}/tools/state-grants-calculator`,
    images: [{ url: `/api/og?title=${encodeURIComponent("State Grants Calculator")}&sub=${encodeURIComponent("Stamp Duty · First Home Grants by State · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Tools", url: "/tools" },
  { name: "State Grants Calculator", url: "/tools/state-grants-calculator" },
]);

const calcLd = calculatorJsonLd({
  name: "First Home Owner Grant Calculator by State",
  description:
    "Estimate your state's FHOG, stamp-duty concession, and First Home Guarantee eligibility for a given property type, purchase price, household income, and applicant status.",
  path: "/tools/state-grants-calculator",
});

const faqLd = faqJsonLd([
  {
    q: "How much is the First Home Owner Grant in each state?",
    a: "Queensland and Tasmania pay $30,000 for new builds; South Australia $15,000; NSW, Victoria, Western Australia and Northern Territory $10,000 (Victoria regional $20,000); ACT does not run an FHOG (replaced by the Home Buyer Concession Scheme).",
  },
  {
    q: "Can I claim FHOG for an existing home?",
    a: "Most states restrict the First Home Owner Grant to new builds. Some states (Tasmania) offer separate concessions on established homes (50% stamp-duty discount in Tasmania). Always confirm against your state revenue office.",
  },
  {
    q: "Do FHOG and the First Home Guarantee stack?",
    // dated-ok — "1 October 2025" is the fixed historical date the FHG income caps were removed; never changes
    a: "Yes — they are independent programs. FHOG is a state-government cash grant; the First Home Guarantee is a federal scheme that lets you buy with a 5% deposit without LMI. From 1 October 2025 the First Home Guarantee removed its income caps and place limits — eligibility is now driven by a property-price cap that varies by state and location (capital city / regional centre vs rest of state).",
  },
]);

export default function StateGrantsCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calcLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Suspense>
        <StateGrantsCalculatorClient />
      </Suspense>
    </>
  );
}
