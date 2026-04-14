import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leave a review — invest.com.au",
  description:
    "Share your experience with your advisor. Your review helps other investors choose the right professional.",
  robots: { index: false, follow: false }, // token-based URL, don't index
};

export default function ReviewTokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
