import type { Metadata } from "next";
import type { ReactNode } from "react";

// The join page is an interactive ("use client") membership form, so it cannot
// export metadata itself. This server layout supplies it and marks the
// transactional form noindex (no SEO value; keeps it out of the sitemap signal).
export const metadata: Metadata = {
  title: "Join an Investing Club",
  robots: { index: false, follow: true },
};

export default function JoinLayout({ children }: { children: ReactNode }) {
  return children;
}
