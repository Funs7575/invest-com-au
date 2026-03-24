import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import StartClient from "./StartClient";

export const metadata: Metadata = {
  title: "Find Your Best Investing Path — 60-Second Quiz",
  description:
    "Answer 5 quick questions and we'll point you to the right platform, the right advisor, or both. Free, independent, and personalised to your situation.",
  openGraph: {
    title: "Find Your Best Investing Path — Invest.com.au",
    description:
      "Answer 5 quick questions to get personalised platform and advisor recommendations. Free and independent.",
    images: [
      {
        url: "/api/og?title=Find+Your+Best+Path&subtitle=Personalised+recommendations+in+60+seconds&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/quiz" },
};

export default function StartPage() {
  return <StartClient />;
}
