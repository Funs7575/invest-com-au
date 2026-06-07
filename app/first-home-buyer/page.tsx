import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import HubPage from "@/components/HubPage";
import HubNewsletterCapture from "@/components/HubNewsletterCapture";
import LeadMagnetCapture from "@/components/LeadMagnetCapture";
import HubExitIntent from "@/components/HubExitIntent";
import FhbSavingsMatch from "@/components/first-home-buyer/FhbSavingsMatch";
import FhbBuyersAgentHandoff from "@/components/first-home-buyer/FhbBuyersAgentHandoff";
import ArticleBrokerTable from "@/components/ArticleBrokerTable";
import { getLeadMagnetForHub } from "@/lib/lead-magnets";
import { firstHomeBuyerHubConfig } from "@/lib/hub-configs/first-home-buyer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `First Home Buyer Hub (${CURRENT_YEAR}) — FHSS, Grants, Deposit & Mortgages`,
  description: firstHomeBuyerHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/first-home-buyer` },
  openGraph: {
    title: `First Home Buyer Hub (${CURRENT_YEAR}) — FHSS, Grants & Mortgages`,
    description: firstHomeBuyerHubConfig.metaDescription,
    url: `${SITE_URL}/first-home-buyer`,
    images: [{ url: `/api/og?title=${encodeURIComponent("First Home Buyer Hub Australia")}&sub=${encodeURIComponent("Grants · Guarantee · Stamp Duty · FHSS · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function FirstHomeBuyerPage() {
  const leadMagnet = getLeadMagnetForHub("first-home-buyer");

  return (
    <>
      <HubPage
        config={firstHomeBuyerHubConfig}
        newsletterCapture={
          <HubNewsletterCapture
            segmentSlug="first-home-buyer-hub"
            hubTitle="First Home Buyer"
            leadMagnetTitle="Free First Home Buyer Action Plan"
          />
        }
      >
        <FhbSavingsMatch />
        <div className="container-custom max-w-4xl">
          <ArticleBrokerTable
            vertical="savings"
            maxBrokers={4}
            heading="High-interest savings accounts for your deposit"
          />
        </div>
        <FhbBuyersAgentHandoff />
        {leadMagnet && <LeadMagnetCapture magnet={leadMagnet} />}
      </HubPage>
      <HubExitIntent
        segmentSlug="first-home-buyer-hub"
        hubName="First Home Buyer"
      />
    </>
  );
}
