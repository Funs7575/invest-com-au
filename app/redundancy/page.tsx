import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import HubPage from "@/components/HubPage";
import HubNewsletterCapture from "@/components/HubNewsletterCapture";
import LeadMagnetCapture from "@/components/LeadMagnetCapture";
import HubExitIntent from "@/components/HubExitIntent";
import { getLeadMagnetForHub } from "@/lib/lead-magnets";
import { redundancyHubConfig } from "@/lib/hub-configs/redundancy";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Redundancy Hub (${CURRENT_YEAR}) — ETP Tax, Super Strategy & Financial Rebuild`,
  description: redundancyHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/redundancy` },
  openGraph: {
    title: `Redundancy Hub (${CURRENT_YEAR}) — ETP Tax & Financial Rebuild`,
    description: redundancyHubConfig.metaDescription,
    url: `${SITE_URL}/redundancy`,
  },
};

export default function RedundancyHubPage() {
  const leadMagnet = getLeadMagnetForHub("redundancy");

  return (
    <>
      <HubPage
        config={redundancyHubConfig}
        newsletterCapture={
          <HubNewsletterCapture
            segmentSlug="redundancy-hub"
            hubTitle="Redundancy"
            leadMagnetTitle="Free Redundancy Financial Action Checklist"
          />
        }
      >
        {leadMagnet && <LeadMagnetCapture magnet={leadMagnet} />}
      </HubPage>
      <HubExitIntent
        segmentSlug="redundancy-hub"
        hubName="Redundancy"
      />
    </>
  );
}
