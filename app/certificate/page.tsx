import type { Metadata } from "next";
import CertificateLookupClient from "./CertificateLookupClient";

export const metadata: Metadata = {
  title: "Certificate Verification | Invest.com.au Academy",
  description:
    "Verify a CPD certificate issued by Invest.com.au Academy. Enter your certificate number to confirm authenticity.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/certificate" },
};

export default function CertificateLookupPage() {
  return <CertificateLookupClient />;
}
