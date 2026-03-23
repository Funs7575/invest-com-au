"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export default function AdvisorDirectory() {
  const [activeTab, setActiveTab] = useState<"property" | "wealth">("property");

  const isProperty = activeTab === "property";

  return (
    <section className="py-6 md:py-10 bg-gradient-to-b from-amber-50/30 to-white">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-3 md:mb-5">
          <h2 className="text-lg md:text-2xl font-bold text-slate-900">
            Find a Verified{" "}
            <span className="text-amber-600">
              {isProperty ? "Property Expert" : "Financial Advisor"}
            </span>
          </h2>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1 max-w-lg">
            <span className="hidden md:inline">Every advisor verified against ASIC registers. Free consultation, no obligation to proceed.</span>
            <span className="md:hidden">ASIC-verified professionals · Free consultation</span>
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 w-max mb-5 md:mb-7">
          <button
            onClick={() => setActiveTab("property")}
            className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-semibold transition-all min-h-[36px] md:min-h-[40px] ${
              isProperty
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            I want property help
          </button>
          <button
            onClick={() => setActiveTab("wealth")}
            className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-semibold transition-all min-h-[36px] md:min-h-[40px] ${
              !isProperty
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            I want to grow wealth
          </button>
        </div>

        {/* Single high-intent matchmaking CTA */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 md:p-8 lg:p-10">
            <div className="max-w-2xl mx-auto text-center">
              {/* Icon */}
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-amber-500 to-amber-400 shadow-amber-500/20">
                <Icon name={isProperty ? "building" : "users"} size={26} className="text-white" />
              </div>

              {/* Headline */}
              <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 leading-tight">
                {isProperty
                  ? "Access Off-Market Property & Verified Buyer's Agents"
                  : "Get Matched With a Verified Financial Advisor"}
              </h3>

              {/* Sub-headline */}
              <p className="text-sm md:text-base text-slate-600 mb-6 leading-relaxed">
                {isProperty
                  ? "Stop guessing which agent to call. Our AI matches you with the right buyer's agent or mortgage broker based on your situation — so you enter negotiations with a verified expert in your corner."
                  : "Answer a few questions and we'll connect you with the right ASIC-verified professional for your goals — whether it's wealth building, SMSF, insurance, or tax strategy."}
              </p>

              {/* Trust signals row */}
              <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500 mb-6">
                <span className="flex items-center gap-1.5">
                  <Icon name="shield-check" size={13} className="text-amber-500" />
                  ASIC-verified professionals only
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="check-circle" size={13} className="text-amber-500" />
                  Your details go to one advisor — never sold
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" size={13} className="text-amber-500" />
                  60 seconds to match
                </span>
              </div>

              {/* Primary CTA */}
              <Link
                href="/find-advisor"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 min-h-[52px] bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm md:text-base font-bold rounded-xl shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
              >
                {isProperty ? "Match Me With a Property Expert" : "Match Me With a Financial Advisor"}
                <Icon name="arrow-right" size={16} className="text-slate-900" />
              </Link>

              <p className="mt-3 text-[0.7rem] text-slate-400">Free · No obligation · Takes 60 seconds</p>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-center gap-6 flex-wrap">
            <span className="text-[0.7rem] font-semibold text-slate-500 uppercase tracking-wide">
              Professionals we verify:
            </span>
            {isProperty ? (
              <>
                <span className="text-xs text-slate-600 font-medium">Buyer&apos;s Agents</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-600 font-medium">Mortgage Brokers</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-600 font-medium">Property Advisors</span>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-600 font-medium">Financial Planners</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-600 font-medium">SMSF Accountants</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-600 font-medium">Wealth Managers</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
