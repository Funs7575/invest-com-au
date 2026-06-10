import type { Metadata } from "next";
import PartnerLeadsDashboard from "./PartnerLeadsDashboard";

export const metadata: Metadata = {
  title: "Partner Lead Dashboard | Invest.com.au",
  description:
    "Track the leads you've delivered to Invest.com.au: delivery volume, advisor response times, conversion funnel, and billing.",
  robots: { index: false, follow: false },
};

export default function PartnerLeadsPage() {
  return <PartnerLeadsDashboard />;
}
