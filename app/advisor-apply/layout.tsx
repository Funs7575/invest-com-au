import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Listed — Join the Invest.com.au Advisor Directory",
  description: "Apply to join Australia's independent financial advisor directory. Free listing, verified badge, qualified investor leads. Only pay per enquiry.",
  alternates: { canonical: "/advisor-apply" },
  openGraph: {
    title: "Get Listed on Invest.com.au",
    description: "Join the advisor directory. Free listing, verified badge, qualified leads.",
    images: [{ url: "/api/og?title=Get+Listed&subtitle=Join+the+advisor+directory&type=default", width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export default function AdvisorApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
