import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Join Club — Invest.com.au",
  description: "Accept your club membership invitation and get started.",
};

export default function JoinLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
