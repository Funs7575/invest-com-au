import ToolsClient from "./ToolsClient";

export const metadata = {
  title: "Best Financial Tools & Apps in Australia (2026)",
  description:
    "Discover the best fintech tools and apps for Australian investors and savers. Compare budgeting apps, investing platforms, tax software, super tools, and more.",
  openGraph: {
    title: "Best Financial Tools & Apps in Australia (2026)",
    description:
      "Compare the best fintech tools for budgeting, investing, tax, super, banking, and crypto in Australia.",
    images: [
      {
        url: "/api/og?title=Best+Financial+Tools&subtitle=Apps+%26+Fintech+for+Australians&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/tools" },
};

export const revalidate = 3600;

export default function ToolsPage() {
  return <ToolsClient />;
}
