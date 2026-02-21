import type { Metadata } from "next";
import ProPageClient from "./ProPageClient";

export const metadata: Metadata = {
  title: "Investor Pro — Premium Membership",
  description:
    "Unlock fee alerts, advanced comparison tools, monthly market briefs, and an ad-free experience. From $9/month.",
  openGraph: {
    title: "Investor Pro — Premium Membership | Invest.com.au",
    description:
      "Unlock fee alerts, advanced comparison tools, monthly market briefs, and an ad-free experience. From $9/month.",
    images: [
      {
        url: "/api/og?title=Investor+Pro&subtitle=Premium+tools+for+smarter+investing&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/pro" },
};

export default function ProPage() {
  return <ProPageClient />;
}
