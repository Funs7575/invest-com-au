import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advisor Signup",
  description: "Register as a financial advisor on Invest.com.au. Create your profile, get verified, and connect with Australian investors seeking professional advice.",
  alternates: { canonical: "/advisor-signup" },
  robots: { index: true, follow: true },
};

export default function AdvisorSignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
