import JobsClient from "./JobsClient";

export const metadata = {
  title: "Finance Jobs in Australia — Advisor, Broker & Planner Careers (2026)",
  description:
    "Browse finance job listings across Australia including mortgage brokers, financial planners, insurance brokers, accountants, and property professionals.",
  openGraph: {
    title: "Finance Jobs in Australia — Advisor, Broker & Planner Careers (2026)",
    description:
      "Find finance careers in Australia. Mortgage brokers, financial planners, insurance, accounting, and property roles.",
    images: [
      {
        url: "/api/og?title=Finance+Jobs+Australia&subtitle=Advisor,+Broker+%26+Planner+Careers&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/jobs" },
};

export const revalidate = 3600;

export default function JobsPage() {
  return <JobsClient />;
}
