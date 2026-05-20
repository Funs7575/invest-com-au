import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import DaspClient from "./DaspClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "DASP Calculator — Departing Australia Superannuation Payment Tax",
  description:
    "Estimate the tax withheld when you claim your Australian super as a Departing Australia Superannuation Payment (DASP). 35% for temporary residents, 65% for Working Holiday Makers.",
  alternates: { canonical: "/dasp-calculator" },
  openGraph: {
    title: "DASP Calculator — Departing Australia Super Tax",
    description:
      "Work out the DASP tax withheld on your Australian super when you leave Australia, and what you'll actually receive after the Government's fixed rates.",
    url: absoluteUrl("/dasp-calculator"),
    images: [
      {
        url: "/api/og?title=DASP+Calculator&subtitle=Departing+Australia+Super+Tax&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = calculatorJsonLd({
  name: "DASP Calculator",
  description:
    "Free DASP (Departing Australia Superannuation Payment) tax calculator. Estimates the withholding tax on your Australian super when you leave Australia and the net amount you receive.",
  path: "/dasp-calculator",
});

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "DASP Calculator", url: absoluteUrl("/dasp-calculator") },
]);

const faqLd = faqJsonLd([
  {
    q: "What is a DASP?",
    a: "A Departing Australia Superannuation Payment (DASP) lets a temporary resident claim their Australian superannuation after they permanently leave Australia and their visa has ceased. It is not available to Australian or New Zealand citizens or permanent residents.",
  },
  {
    q: "How much tax is withheld on a DASP?",
    a: "For a DASP paid on or after 1 July 2017: the tax-free component is taxed at 0%, the taxed element of the taxable component at 35%, and the untaxed element at 45%. Working Holiday Makers (subclass 417/462) are taxed at 65% on the whole taxable component.",
  },
  {
    q: "Can the DASP tax rate be reduced?",
    a: "No. DASP withholding rates are set by the Australian Government and cannot be reduced through deductions or offsets. The fund withholds the tax before paying you, so you receive the net amount.",
  },
  {
    q: "Why am I taxed 65% as a Working Holiday Maker?",
    a: "If you held a Working Holiday Maker visa (subclass 417 or 462) at any time, your DASP is a 'DASP WHM payment' taxed at a flat 65% on the entire taxable component. This applies even if you later held a different visa.",
  },
  {
    q: "How do I claim my DASP?",
    a: "Apply through the ATO's DASP online application system once you have left Australia and your temporary visa has ceased or been cancelled. A registered tax or migration agent who handles DASP processing can lodge and follow up the claim for you.",
  },
]);

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

export default function DaspCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Suspense fallback={<Loading />}>
        <DaspClient />
      </Suspense>
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>
    </>
  );
}
