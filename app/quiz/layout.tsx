import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Broker Quiz — Filter Brokers in 60 Seconds",
  description:
    "Answer 5 quick questions and narrow down Australian brokers based on your priorities. Free, independent, and takes under 60 seconds.",
  openGraph: {
    title: "Broker Quiz — Filter Brokers in 60 Seconds",
    description:
      "Answer 5 quick questions and narrow down Australian brokers based on your priorities.",
    images: [
      {
        url: "/api/og?title=Find+Your+Best+Broker&subtitle=Take+the+60-second+quiz&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Broker Quiz — Filter Brokers in 60 Seconds",
    description:
      "Answer 5 quick questions and narrow down Australian brokers based on your priorities.",
  },
  alternates: {
    canonical: "/quiz",
  },
};

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
