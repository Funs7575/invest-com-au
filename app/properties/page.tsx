import PropertiesClient from "./PropertiesClient";

export const metadata = {
  title: "Investment Property Listings — Australian Property Opportunities (2026)",
  description:
    "Browse illustrative investment property listings across Australia. Compare yields, rental returns, and suburbs to find your next investment property opportunity.",
  openGraph: {
    title: "Investment Property Listings — Australian Property Opportunities (2026)",
    description:
      "Browse investment property opportunities across Australia. Compare gross yields, weekly rents, and suburb profiles.",
    images: [
      {
        url: "/api/og?title=Investment+Property+Listings&subtitle=Australian+Property+Opportunities&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/properties" },
};

export const revalidate = 3600;

export default function PropertiesPage() {
  return <PropertiesClient />;
}
