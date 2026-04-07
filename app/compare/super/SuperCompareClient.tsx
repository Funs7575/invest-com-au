"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import SocialProofCounter from "@/components/SocialProofCounter";
import AdvisorMatchCTA from "@/components/AdvisorMatchCTA";

/* ─── Types ─── */

type SuperFundType = "Industry" | "Retail" | "Retail/Index";

type SuperFund = {
  name: string;
  type: SuperFundType;
  balanced_fee_pct: number;
  investment_options: number;
  insurance_included: boolean;
  description: string;
};

/* ─── Hardcoded data — 15 popular Australian super funds (last verified: March 2026) ─── */

const SUPER_FUNDS: SuperFund[] = [
  {
    name: "AustralianSuper",
    type: "Industry",
    balanced_fee_pct: 0.67,
    investment_options: 12,
    insurance_included: true,
    description:
      "Australia's largest super fund by assets under management. Consistently a top performer across balanced and high-growth options.",
  },
  {
    name: "Australian Retirement Trust",
    type: "Industry",
    balanced_fee_pct: 0.72,
    investment_options: 10,
    insurance_included: true,
    description:
      "Formed from the merger of Sunsuper and QSuper. Offers strong long-term returns and a broad range of investment choices.",
  },
  {
    name: "UniSuper",
    type: "Industry",
    balanced_fee_pct: 0.63,
    investment_options: 18,
    insurance_included: true,
    description:
      "One of the lowest-fee industry funds with an impressive range of investment options including direct shares and term deposits.",
  },
  {
    name: "Hostplus",
    type: "Industry",
    balanced_fee_pct: 0.85,
    investment_options: 14,
    insurance_included: true,
    description:
      "Historically strong performer in balanced and high-growth categories. Popular with hospitality and tourism workers.",
  },
  {
    name: "HESTA",
    type: "Industry",
    balanced_fee_pct: 0.72,
    investment_options: 8,
    insurance_included: true,
    description:
      "Serves health and community services workers. Known for responsible investing and competitive long-term returns.",
  },
  {
    name: "Cbus",
    type: "Industry",
    balanced_fee_pct: 0.81,
    investment_options: 7,
    insurance_included: true,
    description:
      "Built for the building and construction industry. Offers tailored insurance and strong infrastructure investments.",
  },
  {
    name: "REST",
    type: "Industry",
    balanced_fee_pct: 0.78,
    investment_options: 9,
    insurance_included: true,
    description:
      "One of Australia's largest funds for retail and fast-food workers. Simple investment menu with competitive returns.",
  },
  {
    name: "Aware Super",
    type: "Industry",
    balanced_fee_pct: 0.64,
    investment_options: 11,
    insurance_included: true,
    description:
      "Formerly First State Super. Serves public sector and community workers with solid balanced performance and low fees.",
  },
  {
    name: "Colonial First State",
    type: "Retail",
    balanced_fee_pct: 0.89,
    investment_options: 200,
    insurance_included: false,
    description:
      "A major retail platform offering hundreds of investment options across all asset classes. Higher fees but maximum flexibility.",
  },
  {
    name: "MLC",
    type: "Retail",
    balanced_fee_pct: 0.95,
    investment_options: 150,
    insurance_included: false,
    description:
      "Owned by Insignia Financial. Wide range of managed fund options with advisor-supported service models.",
  },
  {
    name: "BT Super",
    type: "Retail",
    balanced_fee_pct: 0.92,
    investment_options: 120,
    insurance_included: false,
    description:
      "Westpac's super platform with extensive investment choices. Strong integration with Westpac banking services.",
  },
  {
    name: "Vanguard Super",
    type: "Retail/Index",
    balanced_fee_pct: 0.56,
    investment_options: 6,
    insurance_included: false,
    description:
      "Low-cost index-based super. Ideal for cost-conscious investors who want simple, diversified portfolios with minimal fees.",
  },
  {
    name: "Spaceship Super",
    type: "Retail",
    balanced_fee_pct: 0.6,
    investment_options: 3,
    insurance_included: false,
    description:
      "Tech-focused super fund popular with younger Australians. Offers a growth portfolio weighted towards global technology companies.",
  },
  {
    name: "QSuper",
    type: "Industry",
    balanced_fee_pct: 0.62,
    investment_options: 8,
    insurance_included: true,
    description:
      "Queensland government employees' fund, now part of Australian Retirement Trust. Known for strong risk-adjusted returns.",
  },
  {
    name: "Vision Super",
    type: "Industry",
    balanced_fee_pct: 0.73,
    investment_options: 7,
    insurance_included: true,
    description:
      "Serves Victorian local government workers. A smaller fund with competitive fees and personalised member services.",
  },
];

/* ─── Category filters ─── */

type Category = "All" | "Industry" | "Retail" | "Balanced" | "High Growth";
const CATEGORIES: Category[] = ["All", "Industry", "Retail", "Balanced", "High Growth"];

type SortKey = "name" | "balanced_fee_pct" | "investment_options";
type SortDir = "asc" | "desc";

export default function SuperCompareClient() {
  const [category, setCategory] = useState<Category>("All");
  const [sortKey, setSortKey] = useState<SortKey>("balanced_fee_pct");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "asc");
    }
  };

  const filtered = useMemo(() => {
    let funds = [...SUPER_FUNDS];

    if (category === "Industry") {
      funds = funds.filter((f) => f.type === "Industry");
    } else if (category === "Retail") {
      funds = funds.filter((f) => f.type === "Retail" || f.type === "Retail/Index");
    } else if (category === "Balanced") {
      funds = funds.filter((f) => f.balanced_fee_pct <= 0.7);
    } else if (category === "High Growth") {
      funds = funds.filter((f) => f.investment_options >= 10);
    }

    funds.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return funds;
  }, [category, sortKey, sortDir]);

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return (
      <Icon
        name={sortDir === "asc" ? "arrow-up" : "arrow-down"}
        size={14}
        className="inline ml-1 text-violet-400"
      />
    );
  };

  return (
    <div>
      {/* ─── Hero ─── */}
      <section className="bg-gradient-to-br from-violet-600 to-violet-800 text-white py-14 md:py-20">
        <div className="container-custom text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">
            Compare Super Funds in Australia
          </h1>
          <p className="text-violet-200 text-lg md:text-xl max-w-2xl mx-auto mb-4">
            Side-by-side fees, performance, and features for Australia&rsquo;s biggest super funds
            &mdash; industry vs retail, balanced options, and insurance.
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
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Showing {filtered.length} fund{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* ─── Desktop table ─── */}
        <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th
                  className="px-4 py-3 font-semibold text-slate-700 cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  Fund {sortIndicator("name")}
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                <th
                  className="px-4 py-3 font-semibold text-slate-700 cursor-pointer select-none"
                  onClick={() => handleSort("balanced_fee_pct")}
                >
                  Balanced Fee % {sortIndicator("balanced_fee_pct")}
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">Insurance</th>
                <th
                  className="px-4 py-3 font-semibold text-slate-700 cursor-pointer select-none"
                  onClick={() => handleSort("investment_options")}
                >
                  Options {sortIndicator("investment_options")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fund) => (
                <tr
                  key={fund.name}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">{fund.name}</span>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {fund.description}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        fund.type === "Industry"
                          ? "bg-emerald-50 text-emerald-700"
                          : fund.type === "Retail/Index"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {fund.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-800">
                    {fund.balanced_fee_pct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    {fund.insurance_included ? (
                      <Icon name="check" size={18} className="text-emerald-500 inline" />
                    ) : (
                      <Icon name="x" size={18} className="text-slate-300 inline" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{fund.investment_options}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── Mobile cards ─── */}
        <div className="md:hidden space-y-3">
          {filtered.map((fund) => (
            <div key={fund.name} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{fund.name}</h3>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      fund.type === "Industry"
                        ? "bg-emerald-50 text-emerald-700"
                        : fund.type === "Retail/Index"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {fund.type}
                  </span>
                </div>
                <span className="font-mono text-lg font-bold text-violet-700">
                  {fund.balanced_fee_pct.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{fund.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded-md p-2">
                  <span className="text-slate-400 block">Options</span>
                  <span className="font-semibold text-slate-700">{fund.investment_options}</span>
                </div>
                <div className="bg-slate-50 rounded-md p-2">
                  <span className="text-slate-400 block">Insurance</span>
                  <span className="font-semibold text-slate-700">
                    {fund.insurance_included ? "Included" : "Not included"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── SEO content ─── */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            How to Choose the Right Super Fund in Australia
          </h2>
          <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
            <p>
              Superannuation is one of the biggest financial assets most Australians will ever have.
              Choosing the right fund can mean tens of thousands of dollars more at retirement. The
              key factors to compare are <strong>fees</strong>, <strong>investment performance</strong>,{" "}
              <strong>insurance cover</strong>, and <strong>investment options</strong>.
            </p>
            <p>
              <strong>Industry funds vs retail funds:</strong> Industry funds are run on a
              not-for-profit basis, meaning profits are returned to members as better returns or lower
              fees. Retail funds, run by banks and financial institutions, typically offer more
              investment options but at a higher cost. In recent years, industry funds have
              outperformed retail funds on average.
            </p>
            <p>
              <strong>Fees matter more than you think:</strong> Even a small difference in fees (e.g.
              0.3% p.a.) can compound to tens of thousands over a 30-year career. Always compare the
              total fee, including administration fees and investment management costs, not just the
              headline rate.
            </p>
            <p>
              <strong>Insurance through super:</strong> Most industry funds include default life and
              TPD insurance, funded from your super balance. Retail funds often require you to opt in
              separately. Review your cover regularly to ensure it matches your needs.
            </p>
          </div>
        </section>

        {/* ─── Advisor CTA ─── */}
        <AdvisorMatchCTA
          needKey="planning"
          headline="Need help comparing super funds?"
          description="A financial planner can review your super, consolidate accounts, and help you understand your investment options and insurance cover."
        />
      </div>
    </div>
  );
}
