import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Founder Sign Up — Invest.com.au",
  description: "Register your startup and connect with wholesale investors on Invest.com.au.",
  robots: { index: false, follow: false },
};

export default function StartupSignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
