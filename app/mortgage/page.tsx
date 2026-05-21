import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import HubPage from "@/components/HubPage";
import HubNewsletterCapture from "@/components/HubNewsletterCapture";
import HubExitIntent from "@/components/HubExitIntent";
import { mortgageHubConfig } from "@/lib/hub-configs/mortgage";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Home Loans & Mortgages Australia (${CURRENT_YEAR}) — Broker Guide & Referral`,
  description: mortgageHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/mortgage` },
  openGraph: {
    title: `Home Loans & Mortgages (${CURRENT_YEAR})`,
    description: mortgageHubConfig.metaDescription,
    url: `${SITE_URL}/mortgage`,
  },
  twitter: { card: "summary_large_image" },
};

export default function MortgagePage() {
  return (
    <>
      <HubPage
        config={mortgageHubConfig}
        newsletterCapture={
          <HubNewsletterCapture
            segmentSlug="mortgage-hub"
            hubTitle="Home Loans"
          />
        }
      />
      <HubExitIntent segmentSlug="mortgage-hub" hubName="Home Loans" />
    </>
  );
}
