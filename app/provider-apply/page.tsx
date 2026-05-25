import type { Metadata } from "next";
import ProviderApplyClient from "./ProviderApplyClient";

export const metadata: Metadata = {
  title: "Register as a CPD Provider | Invest.com.au",
  description:
    "List your courses on Invest.com.au and reach 30,000+ Australian financial professionals. Free to apply — we review all applications within 5 business days.",
  alternates: { canonical: "/provider-apply" },
};

export default function ProviderApplyPage() {
  return <ProviderApplyClient />;
}
