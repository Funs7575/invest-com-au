import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join as an Advisor",
  description: "Register your financial advisory practice on Invest.com.au. Get listed, receive investor leads, and grow your client base.",
  robots: { index: true, follow: true },
};

export default function AdvisorSignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
