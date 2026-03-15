"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  type: "full-time" | "part-time" | "contract";
  salary_range: string;
  category: "mortgage_broker" | "financial_planner" | "insurance" | "accounting" | "property";
  posted_date: string;
  description: string;
}

/* ─── Sample Data ─── */

const JOBS: Job[] = [
  {
    id: 1,
    title: "Senior Mortgage Broker",
    company: "Aussie Home Loans",
    location: "Sydney NSW",
    type: "full-time",
    salary_range: "$120k-$180k + trail",
    category: "mortgage_broker",
    posted_date: "2026-03-10",
    description:
      "Join one of Australia's leading mortgage broking networks. Manage a growing client book, write residential and commercial loans, and mentor junior brokers.",
  },
  {
    id: 2,
    title: "Financial Planner",
    company: "AMP",
    location: "Melbourne VIC",
    type: "full-time",
    salary_range: "$100k-$140k",
    category: "financial_planner",
    posted_date: "2026-03-08",
    description:
      "Provide holistic financial advice to high-net-worth clients across superannuation, investments, insurance, and estate planning. CFP or equivalent required.",
  },
  {
    id: 3,
    title: "Insurance Broker",
    company: "Steadfast Group",
    location: "Brisbane QLD",
    type: "full-time",
    salary_range: "$80k-$120k",
    category: "insurance",
    posted_date: "2026-03-06",
    description:
      "Work with SME clients to assess risk and place general insurance policies. Strong commission structure on top of base salary.",
  },
  {
    id: 4,
    title: "SMSF Accountant",
    company: "Hall Chadwick",
    location: "Perth WA",
    type: "full-time",
    salary_range: "$90k-$130k",
    category: "accounting",
    posted_date: "2026-03-05",
    description:
      "Specialise in self-managed super fund administration, compliance, and tax returns. CPA or CA qualification required.",
  },
  {
    id: 5,
    title: "Buyers Agent",
    company: "Propertyology",
    location: "Brisbane QLD",
    type: "full-time",
    salary_range: "$85k-$130k + commissions",
    category: "property",
    posted_date: "2026-03-04",
    description:
      "Research high-growth markets, source off-market properties, and negotiate acquisitions for investor clients across Australia.",
  },
  {
    id: 6,
    title: "Junior Financial Planner",
    company: "Insignia Financial",
    location: "Sydney NSW",
    type: "full-time",
    salary_range: "$70k-$90k",
    category: "financial_planner",
    posted_date: "2026-03-03",
    description:
      "Support senior planners with statement of advice preparation, client reviews, and para-planning. Great pathway to becoming an authorised adviser.",
  },
  {
    id: 7,
    title: "Mortgage Broker - Contract",
    company: "Loan Market",
    location: "Adelaide SA",
    type: "contract",
    salary_range: "$100k-$150k (contract)",
    category: "mortgage_broker",
    posted_date: "2026-03-01",
    description:
      "6-month contract to support a growing Adelaide team. Handle residential loan applications from submission to settlement. MFAA/FBAA membership required.",
  },
  {
    id: 8,
    title: "Tax Accountant",
    company: "H&R Block",
    location: "Melbourne VIC",
    type: "part-time",
    salary_range: "$55k-$75k (pro-rata)",
    category: "accounting",
    posted_date: "2026-02-28",
    description:
      "Part-time role preparing individual and small business tax returns. Flexible hours during peak season. Registered tax agent status preferred.",
  },
  {
    id: 9,
    title: "Property Investment Analyst",
    company: "CoreLogic",
    location: "Sydney NSW",
    type: "full-time",
    salary_range: "$95k-$125k",
    category: "property",
    posted_date: "2026-02-25",
    description:
      "Analyse property market data, produce suburb-level research reports, and support investors with data-driven insights across Australian capital cities.",
  },
  {
    id: 10,
    title: "Life Insurance Specialist",
    company: "TAL",
    location: "Melbourne VIC",
    type: "full-time",
    salary_range: "$90k-$110k + bonuses",
    category: "insurance",
    posted_date: "2026-02-22",
    description:
      "Work with financial advisers and direct clients to structure life, TPD, trauma, and income protection cover tailored to individual needs.",
  },
];

/* ─── Filter Config ─── */

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "mortgage_broker", label: "Broker" },
  { key: "financial_planner", label: "Planner" },
  { key: "insurance", label: "Insurance" },
  { key: "accounting", label: "Accounting" },
  { key: "property", label: "Property" },
] as const;

type CategoryKey = (typeof CATEGORY_TABS)[number]["key"];

const TYPE_BADGE_COLORS: Record<Job["type"], string> = {
  "full-time": "bg-emerald-100 text-emerald-700",
  "part-time": "bg-amber-100 text-amber-700",
  contract: "bg-purple-100 text-purple-700",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

/* ─── Component ─── */

export default function JobsClient() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");

  const filtered = useMemo(() => {
    if (activeCategory === "all") return JOBS;
    return JOBS.filter((j) => j.category === activeCategory);
  }, [activeCategory]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-slate-700 to-slate-900 text-white py-10 md:py-16">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-3">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-white">Finance Jobs</span>
          </nav>
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">
            Finance Jobs in Australia
          </h1>
          <p className="text-sm md:text-lg text-slate-300 max-w-2xl">
            Browse finance career opportunities across mortgage broking, financial planning,
            insurance, accounting, and property advisory.
          </p>
        </div>
      </section>

      <div className="container-custom py-6 md:py-10">
        {/* Post a Job CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-200 rounded-xl bg-slate-50 p-4 md:p-5 mb-6">
          <div>
            <h2 className="text-sm md:text-base font-bold text-slate-900">
              Hiring? Post a Job
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Reach thousands of finance professionals across Australia.
            </p>
          </div>
          <Link
            href="/for-advisors"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
          >
            <Icon name="plus-circle" size={14} className="text-white" />
            Post a Job
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Filter by category">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeCategory === tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeCategory === tab.key
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Job Cards */}
        <div className="space-y-4">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow p-4 md:p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-slate-600 mb-2">
                    <span className="font-medium">{job.company}</span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1">
                      <Icon name="map-pin" size={12} className="text-slate-400" />
                      {job.location}
                    </span>
                    <span
                      className={`inline-block text-[0.65rem] md:text-xs font-semibold px-2 py-0.5 rounded-full ${
                        TYPE_BADGE_COLORS[job.type]
                      }`}
                    >
                      {job.type}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-500 mb-2 line-clamp-2">
                    {job.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="font-semibold text-slate-700">{job.salary_range}</span>
                    <span>Posted {formatDate(job.posted_date)}</span>
                  </div>
                </div>
                <a
                  href={`mailto:jobs@invest.com.au?subject=Application: ${encodeURIComponent(job.title)} at ${encodeURIComponent(job.company)}`}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
                >
                  <Icon name="arrow-right" size={14} className="text-white" />
                  Apply
                </a>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm md:text-lg font-medium mb-1">No jobs found</p>
            <p className="text-xs md:text-sm">Try selecting a different category.</p>
          </div>
        )}

        {/* SEO Content */}
        <section className="border-t border-slate-200 pt-8 mt-10">
          <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 mb-3">
            Finance Careers in Australia
          </h2>
          <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-3">
            <p>
              The Australian financial services industry employs hundreds of thousands of
              professionals across banking, insurance, wealth management, property, and
              accounting. Career opportunities range from frontline mortgage brokers and financial
              planners to quantitative analysts and compliance specialists.
            </p>
            <p>
              Qualifications such as the Diploma of Financial Planning, CPA/CA, and MFAA/FBAA
              membership are common requirements. The sector continues to grow as Australians seek
              more personalised financial advice and digital-first service delivery.
            </p>
          </div>
        </section>

        {/* Contact Note */}
        <p className="text-[0.65rem] md:text-xs text-slate-400 mt-6 border-t border-slate-100 pt-4">
          Want to list a role? Contact us at{" "}
          <a href="mailto:jobs@invest.com.au" className="underline hover:text-slate-600">
            jobs@invest.com.au
          </a>
        </p>
      </div>
    </div>
  );
}
