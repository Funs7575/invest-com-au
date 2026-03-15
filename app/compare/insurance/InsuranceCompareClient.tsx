"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import SocialProofCounter from "@/components/SocialProofCounter";
import AdvisorMatchCTA from "@/components/AdvisorMatchCTA";

/* ─── Types ─── */

type InsuranceCategory = "Life Insurance" | "Income Protection" | "Home & Contents" | "Health";

type Insurer = {
  name: string;
  categories: InsuranceCategory[];
  description: string;
  key_features: string[];
};

/* ─── Hardcoded data — 13 leading Australian insurers ─── */

const INSURERS: Insurer[] = [
  {
    name: "TAL",
    categories: ["Life Insurance", "Income Protection"],
    description:
      "Australia's largest life insurer by market share. Offers comprehensive life, TPD, trauma, and income protection products through advisors and super funds.",
    key_features: [
      "No. 1 life insurer in Australia",
      "Available through most industry super funds",
      "Flexible income protection benefit periods",
      "Rehabilitation and return-to-work support",
    ],
  },
  {
    name: "MLC Life",
    categories: ["Life Insurance", "Income Protection"],
    description:
      "One of Australia's oldest life insurers with a strong focus on advisor-distributed products and claims support.",
    key_features: [
      "130+ years of operation",
      "Income protection with agreed value",
      "Mental health support programs",
      "Flexible premium structures",
    ],
  },
  {
    name: "AIA Australia",
    categories: ["Life Insurance", "Income Protection", "Health"],
    description:
      "Global insurer with a strong Australian presence. Known for their Vitality wellness program that rewards healthy living with premium discounts.",
    key_features: [
      "AIA Vitality wellness rewards program",
      "Life, TPD, trauma & income protection",
      "Health insurance options",
      "Premium discounts for healthy habits",
    ],
  },
  {
    name: "Zurich",
    categories: ["Life Insurance", "Income Protection"],
    description:
      "Swiss-backed insurer offering competitive life and income protection products with strong financial ratings.",
    key_features: [
      "Active Claims Support model",
      "Flexible income protection options",
      "Strong financial strength ratings",
      "Business expense cover available",
    ],
  },
  {
    name: "MetLife",
    categories: ["Life Insurance", "Income Protection"],
    description:
      "US-headquartered global insurer with a significant Australian group insurance presence. Strong focus on workplace and super fund partnerships.",
    key_features: [
      "Major group insurance provider",
      "360Health wellbeing program",
      "Innovative claims management",
      "Strong super fund partnerships",
    ],
  },
  {
    name: "Allianz",
    categories: ["Home & Contents", "Life Insurance"],
    description:
      "One of the world's largest insurers. Offers comprehensive home, contents, landlord, and life insurance products in Australia.",
    key_features: [
      "Home & contents with flexible excess",
      "New-for-old replacement on contents",
      "Landlord insurance available",
      "Combined home & life discounts",
    ],
  },
  {
    name: "AAMI",
    categories: ["Home & Contents"],
    description:
      "Popular Australian home and contents insurer known for straightforward policies and competitive pricing.",
    key_features: [
      "Competitive home & contents premiums",
      "Online quotes in minutes",
      "Optional accidental damage cover",
      "Multi-policy discounts available",
    ],
  },
  {
    name: "NRMA",
    categories: ["Home & Contents"],
    description:
      "Trusted Australian brand offering comprehensive home and contents insurance with flexible cover levels.",
    key_features: [
      "Three levels of home cover",
      "Portable contents for renters",
      "Flood cover included by default",
      "24/7 emergency home assistance",
    ],
  },
  {
    name: "Suncorp",
    categories: ["Home & Contents"],
    description:
      "Major Australian insurer offering home, contents, and landlord insurance with a focus on natural disaster resilience.",
    key_features: [
      "Comprehensive natural disaster cover",
      "Landlord protection plans",
      "Online claims lodgement",
      "Multi-policy discounts",
    ],
  },
  {
    name: "Budget Direct",
    categories: ["Home & Contents"],
    description:
      "Award-winning direct insurer focused on value. Consistently rated among the most affordable home & contents providers.",
    key_features: [
      "Consistently low premiums",
      "No lock-in contracts",
      "Online management portal",
      "Multiple award winner for value",
    ],
  },
  {
    name: "Medibank",
    categories: ["Health"],
    description:
      "Australia's largest private health insurer. Offers hospital, extras, and combined cover with a wide network of providers.",
    key_features: [
      "Australia's biggest health fund",
      "Wide hospital & extras network",
      "Medibank Live Better rewards",
      "Telehealth and mental health support",
    ],
  },
  {
    name: "Bupa",
    categories: ["Health"],
    description:
      "Global health insurer with a major Australian presence. Offers flexible hospital and extras cover with no lock-in contracts.",
    key_features: [
      "No lock-in contracts",
      "Flexible hospital & extras cover",
      "Bupa Blua Health app",
      "Dental, optical & physio extras",
    ],
  },
  {
    name: "HCF",
    categories: ["Health"],
    description:
      "Australia's largest not-for-profit health fund. Known for competitive premiums and high member satisfaction.",
    key_features: [
      "Not-for-profit, member-focused",
      "Competitive premiums",
      "My Members First provider network",
      "No restricted access to hospitals",
    ],
  },
];

/* ─── Category filter ─── */

type FilterCategory = "All" | InsuranceCategory;
const CATEGORIES: FilterCategory[] = [
  "All",
  "Life Insurance",
  "Income Protection",
  "Home & Contents",
  "Health",
];

const CATEGORY_COLORS: Record<InsuranceCategory, string> = {
  "Life Insurance": "bg-violet-50 text-violet-700",
  "Income Protection": "bg-amber-50 text-amber-700",
  "Home & Contents": "bg-sky-50 text-sky-700",
  Health: "bg-emerald-50 text-emerald-700",
};

export default function InsuranceCompareClient() {
  const [category, setCategory] = useState<FilterCategory>("All");

  const filtered = useMemo(() => {
    if (category === "All") return INSURERS;
    return INSURERS.filter((ins) => ins.categories.includes(category as InsuranceCategory));
  }, [category]);

  return (
    <div>
      {/* ─── Hero ─── */}
      <section className="bg-gradient-to-br from-sky-600 to-sky-800 text-white py-14 md:py-20">
        <div className="container-custom text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">
            Compare Insurance in Australia
          </h1>
          <p className="text-sky-200 text-lg md:text-xl max-w-2xl mx-auto mb-4">
            Life insurance, income protection, home &amp; contents, and health insurance &mdash;
            compare Australia&rsquo;s leading insurers side by side.
          </p>
          <SocialProofCounter variant="badge" />
        </div>
      </section>

      {/* ─── Main content ─── */}
      <div className="container-custom py-8 md:py-12">
        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-sm text-slate-500 mb-6">
          Showing {filtered.length} insurer{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* ─── Card grid ─── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((insurer) => (
            <div
              key={insurer.name}
              className="border border-slate-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">{insurer.name}</h3>

              {/* Category badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {insurer.categories.map((cat) => (
                  <span
                    key={cat}
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat]}`}
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-sm text-slate-500 mb-4 flex-grow">{insurer.description}</p>

              {/* Key features */}
              <ul className="space-y-1.5 mb-5">
                {insurer.key_features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                    <Icon name="check" size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={`/find-advisor?need=insurance`}
                className="block w-full text-center px-4 py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors text-sm"
              >
                Get a Quote
              </Link>
            </div>
          ))}
        </div>

        {/* ─── SEO content ─── */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Choosing the Right Insurance in Australia
          </h2>
          <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
            <p>
              Insurance is a critical part of any financial plan. The right cover protects your
              income, your family, and your assets from unexpected events. With dozens of providers
              and hundreds of policies, comparing insurance in Australia can feel overwhelming.
            </p>
            <p>
              <strong>Life insurance and income protection</strong> are essential if you have
              dependants, a mortgage, or debts that would burden your family. Life insurance pays a
              lump sum on death or terminal illness, while income protection replaces up to 75% of
              your income if you&rsquo;re unable to work due to illness or injury.
            </p>
            <p>
              <strong>Home &amp; contents insurance</strong> protects your biggest asset. Make sure
              your sum insured reflects the full rebuild cost (not market value) and check whether
              flood and storm surge are covered, especially in higher-risk areas.
            </p>
            <p>
              <strong>Private health insurance</strong> gives you access to private hospitals, choice
              of doctor, and extras like dental and optical. If you earn above the Medicare Levy
              Surcharge threshold ($93,000 for singles in 2025-26), holding hospital cover can reduce
              your tax bill.
            </p>
            <p>
              An insurance broker compares policies across all major insurers to find the best cover
              at the right price &mdash; at no extra cost to you, as they are paid by the insurer.
            </p>
          </div>
        </section>

        {/* ─── Advisor CTA ─── */}
        <AdvisorMatchCTA
          needKey="insurance"
          headline="Need help finding the right cover?"
          description="An insurance broker compares policies across all major insurers to find you the best cover at the right price."
        />
      </div>
    </div>
  );
}
