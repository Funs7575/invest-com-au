import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Careers | Invest.com.au",
  description:
    "Join the team building Australia's independent investing platform. View open roles at Invest.com.au — engineering, content, and growth.",
  alternates: { canonical: "/about/careers" },
  openGraph: {
    title: "Careers | Invest.com.au",
    description:
      "Join the team building Australia's independent investing platform.",
    url: absoluteUrl("/about/careers"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Careers at Invest.com.au")}&sub=${encodeURIComponent("Join Australia's Independent Investing Platform")}`, width: 1200, height: 630 }],
  },
};

interface Role {
  id: string;
  title: string;
  team: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract";
  description: string;
}

const OPEN_ROLES: Role[] = [
  {
    id: "senior-software-engineer",
    title: "Senior Software Engineer",
    team: "Engineering",
    location: "Remote (Australia)",
    type: "Full-time",
    description:
      "Build and scale invest.com.au's Next.js platform. You'll work across the full stack — React, TypeScript, Supabase, Vercel — shipping features that help Australians make smarter investing decisions.",
  },
  {
    id: "content-writer-investing",
    title: "Content Writer — Investing",
    team: "Editorial",
    location: "Remote (Australia)",
    type: "Full-time",
    description:
      "Write authoritative, fact-checked guides on Australian investing topics: brokers, ETFs, superannuation, tax strategies, and personal finance. ASIC-aware; licensed financial background a plus.",
  },
  {
    id: "seo-growth-manager",
    title: "SEO & Growth Manager",
    team: "Growth",
    location: "Remote (Australia)",
    type: "Full-time",
    description:
      "Own organic growth for invest.com.au. You'll run keyword strategy, technical SEO audits, internal linking architecture, and content gap analysis across 500+ pages.",
  },
];

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "About Us", url: absoluteUrl("/about") },
  { name: "Careers", url: absoluteUrl("/about/careers") },
]);

const jobPostingsLd = OPEN_ROLES.map((role) => ({
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: role.title,
  description: role.description,
  datePosted: "2026-06-01",
  employmentType: role.type === "Full-time" ? "FULL_TIME" : role.type === "Part-time" ? "PART_TIME" : "CONTRACTOR",
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressCountry: "AU",
      addressLocality: "Remote",
    },
  },
  hiringOrganization: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
  },
  directApply: false,
  url: `${SITE_URL}/about/careers`,
  applicantLocationRequirements: {
    "@type": "Country",
    name: "Australia",
  },
}));

const careersFaqs = [
  {
    q: "What is it like to work at Invest.com.au?",
    a: "Invest.com.au is a fully remote, Australia-based team building the country's leading independent investing platform. We operate as a small, high-ownership crew — everyone ships product, works directly with the founders, and sees their contributions reflected in the platform daily. We're editorially independent: no broker or fund manager owns us, so every decision is made in the investor's interest.",
  },
  {
    q: "Are Invest.com.au roles fully remote?",
    a: "Yes. All roles at Invest.com.au are fully remote and open to candidates anywhere in Australia. We are a distributed-first team — there is no Sydney or Melbourne HQ requirement, and we trust people to do great work from wherever they are.",
  },
  {
    q: "How do I apply for a role at Invest.com.au?",
    a: "For listed open roles, click the 'Apply via email' link on the relevant role card. Send your application to careers@invest.com.au with the role title in the subject line. If you don't see a suitable role, we welcome speculative applications — email careers@invest.com.au with a note on what you'd bring to the team.",
  },
  {
    q: "What skills does Invest.com.au look for?",
    a: "It depends on the role. Engineering roles require strong Next.js / TypeScript experience and comfort across the full stack. Editorial roles require deep knowledge of Australian investing, ASIC-awareness, and the ability to write authoritative content that is both accurate and accessible. Growth roles require proven SEO and content-strategy experience. Across all roles, we value intellectual curiosity and a genuine interest in helping Australians make better financial decisions.",
  },
];
const careersFaqLd = faqJsonLd(careersFaqs);

export default function CareersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {jobPostingsLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      {careersFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(careersFaqLd) }}
        />
      )}

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <div className="bg-slate-900 text-white py-10 md:py-16 px-4">
          <div className="container-custom max-w-3xl">
            <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-3">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-1.5">/</span>
              <Link href="/about" className="hover:text-white">About Us</Link>
              <span className="mx-1.5">/</span>
              <span className="text-slate-200">Careers</span>
            </nav>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-3">
              Work at Invest.com.au
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-xl">
              We&apos;re building Australia&apos;s most trusted, independent investing
              platform — one that puts the investor first, always. Come help us
              do that.
            </p>
          </div>
        </div>

        <div className="container-custom max-w-3xl py-8 md:py-12 px-4">
          {/* Values */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Why join us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  heading: "Independence first",
                  body: "We're not owned by a broker or fund manager. Our editorial decisions are ours alone.",
                },
                {
                  heading: "Remote-first",
                  body: "Fully distributed team across Australia. We trust people to do great work wherever they are.",
                },
                {
                  heading: "Impact at scale",
                  body: "Our comparisons influence thousands of investing decisions every week. Your work matters.",
                },
              ].map((v) => (
                <div
                  key={v.heading}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-4"
                >
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{v.heading}</h3>
                  <p className="text-xs text-slate-600">{v.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Open roles */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Open roles ({OPEN_ROLES.length})
            </h2>
            <ul className="space-y-4">
              {OPEN_ROLES.map((role) => (
                <li key={role.id}>
                  <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-slate-900">{role.title}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[0.65rem] font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                          {role.team}
                        </span>
                        <span className="text-[0.65rem] font-semibold bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                          {role.type}
                        </span>
                        <span className="text-[0.65rem] font-semibold bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                          {role.location}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{role.description}</p>
                    <a
                      href={`mailto:careers@invest.com.au?subject=Application — ${encodeURIComponent(role.title)}`}
                      className="inline-block text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
                    >
                      Apply via email
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Speculative */}
          <section className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-1">
              Don&apos;t see the right role?
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              We hire for exceptional people, not just open headcount. Send us a
              note about what you&apos;d bring.
            </p>
            <a
              href="mailto:careers@invest.com.au?subject=Speculative application"
              className="text-xs text-blue-700 hover:underline"
            >
              careers@invest.com.au
            </a>
          </section>

          <section className="mt-10 border-t border-slate-100 pt-8">
            <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {careersFaqs.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                    {faq.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link href="/about" className="text-xs text-blue-700 hover:underline">
              ← Back to About Us
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
