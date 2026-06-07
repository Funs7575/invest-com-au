import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import HubPage from "@/components/HubPage";
import HubNewsletterCapture from "@/components/HubNewsletterCapture";
import LeadMagnetCapture from "@/components/LeadMagnetCapture";
import HubExitIntent from "@/components/HubExitIntent";
import { getLeadMagnetForHub } from "@/lib/lead-magnets";
import { inheritanceHubConfig } from "@/lib/hub-configs/inheritance";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Inheritance Hub (${CURRENT_YEAR}) — CGT, Super Death Benefits & Financial Roadmap`,
  description: inheritanceHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/inheritance` },
  openGraph: {
    title: `Inheritance Hub (${CURRENT_YEAR}) — CGT, Super & Financial Roadmap`,
    description: inheritanceHubConfig.metaDescription,
    url: `${SITE_URL}/inheritance`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Investing an Inheritance in Australia")}&sub=${encodeURIComponent("What to Do First · CGT · Super · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function InheritanceHubPage() {
  const leadMagnet = getLeadMagnetForHub("inheritance");

  return (
    <>
      <HubPage
        config={inheritanceHubConfig}
        newsletterCapture={
          <HubNewsletterCapture
            segmentSlug="inheritance-hub"
            hubTitle="Inheritance"
            leadMagnetTitle="Free Inheritance Financial Action Checklist"
          />
        }
      >
        {leadMagnet && <LeadMagnetCapture magnet={leadMagnet} />}
      </HubPage>
      <HubExitIntent
        segmentSlug="inheritance-hub"
        hubName="Inheritance"
      />
    </>
  );
}
