import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Invest.com.au team. Questions about broker reviews, advertising enquiries, or general feedback.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Us — Invest.com.au",
    description:
      "Get in touch with the Invest.com.au team. Questions, feedback, or advertising enquiries.",
    url: "/contact",
  },
  twitter: { card: "summary" },
};

const CONTACT_OPTIONS = [
  {
    icon: "mail",
    title: "General Enquiries",
    description: "Questions about our reviews, methodology, or anything else.",
    action: "hello@invest.com.au",
    href: "mailto:hello@invest.com.au",
  },
  {
    icon: "building",
    title: "Advertising & Partnerships",
    description: "Interested in listing your platform or running a campaign?",
    action: "partners@invest.com.au",
    href: "mailto:partners@invest.com.au",
  },
  {
    icon: "shield",
    title: "Data Corrections",
    description: "Spotted an error in our fee data or broker information?",
    action: "data@invest.com.au",
    href: "mailto:data@invest.com.au",
  },
  {
    icon: "press",
    title: "Media & Press",
    description: "Journalist enquiries, quotes, or data requests.",
    action: "press@invest.com.au",
    href: "mailto:press@invest.com.au",
  },
];

function ContactIcon({ type }: { type: string }) {
  switch (type) {
    case "mail":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "building":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "shield":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "press":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ContactPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Contact" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="pt-5 pb-12 md:py-16">
        <div className="container-custom max-w-3xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Contact</span>
          </nav>

          <h1 className="text-2xl md:text-4xl font-extrabold mb-2 md:mb-3">
            Get in Touch
          </h1>
          <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-10 max-w-xl">
            We typically respond within 1-2 business days. For urgent data
            corrections, please include the broker name and the specific
            information that needs updating.
          </p>

          {/* Contact options grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {CONTACT_OPTIONS.map((option) => (
              <a
                key={option.title}
                href={option.href}
                className="group bg-white border border-slate-200 rounded-xl p-5 md:p-6 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors shrink-0">
                    <ContactIcon type={option.icon} />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm md:text-base text-slate-900 mb-0.5">
                      {option.title}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 mb-2">
                      {option.description}
                    </p>
                    <span className="text-xs md:text-sm font-medium text-amber-600 group-hover:text-amber-700 transition-colors">
                      {option.action} &rarr;
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Quick links */}
          <div className="mt-8 md:mt-12 bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6">
            <h2 className="font-bold text-sm md:text-base text-slate-900 mb-3">
              Before You Reach Out
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
              <Link
                href="/methodology"
                className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors py-1.5"
              >
                How we score brokers &rarr;
              </Link>
              <Link
                href="/how-we-earn"
                className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors py-1.5"
              >
                How we make money &rarr;
              </Link>
              <Link
                href="/editorial-policy"
                className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors py-1.5"
              >
                Editorial policy &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
