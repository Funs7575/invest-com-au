"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { ProfessionalType } from "@/lib/types";

/**
 * Reusable advisor opt-in checkbox section.
 *
 * Renders a set of advisor-type checkboxes with copy along the lines of
 * "Tick what applies — we'll have a relevant advisor reach out". The parent
 * form is responsible for submitting `selected` to the appropriate API.
 */

export interface AdvisorOptInOption {
  type: ProfessionalType;
  label: string;
  description: string;
  icon: string;
}

/** Default option set — the eight everyday advisor types. Most listings only
 * need this slim list. Specialised forms can pass `options` to override. */
export const DEFAULT_ADVISOR_OPT_INS: AdvisorOptInOption[] = [
  {
    type: "mortgage_broker",
    label: "Mortgage broker",
    description: "Finance, refinancing, or LMI questions",
    icon: "landmark",
  },
  {
    type: "buyers_agent",
    label: "Buyer's agent",
    description: "Sourcing, negotiating, due diligence",
    icon: "search",
  },
  {
    type: "financial_planner",
    label: "Financial planner",
    description: "Wealth strategy, retirement, advice",
    icon: "trending-up",
  },
  {
    type: "tax_agent",
    label: "Tax agent / accountant",
    description: "CGT, deductions, structuring",
    icon: "calculator",
  },
  {
    type: "smsf_accountant",
    label: "SMSF accountant",
    description: "Self-managed super fund setup or compliance",
    icon: "building",
  },
  {
    type: "insurance_broker",
    label: "Insurance broker",
    description: "Life, income protection, landlord cover",
    icon: "shield",
  },
  {
    type: "property_advisor",
    label: "Property advisor",
    description: "Investment strategy, portfolio review",
    icon: "home",
  },
  {
    type: "estate_planner",
    label: "Estate planner",
    description: "Wills, trusts, succession",
    icon: "file-text",
  },
];

export interface AdvisorOptInCheckboxesProps {
  /** Controlled list of selected ProfessionalType values. */
  selected: ProfessionalType[];
  onChange: (next: ProfessionalType[]) => void;
  /** Override the default option list. */
  options?: AdvisorOptInOption[];
  /** Heading shown above the checkboxes. */
  heading?: string;
  /** Subtle description under the heading. */
  subheading?: string;
  /** Compact mode renders a smaller, stacked list (used inside narrow forms). */
  compact?: boolean;
}

export function AdvisorOptInCheckboxes({
  selected,
  onChange,
  options = DEFAULT_ADVISOR_OPT_INS,
  heading = "Want help with this?",
  subheading = "Tick any that apply — a vetted advisor will reach out (no obligation, free).",
  compact = false,
}: AdvisorOptInCheckboxesProps) {
  const [collapsed, setCollapsed] = useState(false);

  function toggle(type: ProfessionalType) {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  }

  function selectAll() {
    onChange(options.map((o) => o.type));
  }

  function clearAll() {
    onChange([]);
  }

  const allSelected = selected.length === options.length;

  return (
    <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Icon name="users" size={16} className="text-amber-600" />
            {heading}
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{subheading}</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-xs font-semibold text-amber-700 hover:text-amber-800 shrink-0"
          aria-label={collapsed ? "Expand options" : "Collapse options"}
          aria-expanded={!collapsed}
        >
          <Icon name={collapsed ? "chevron-down" : "chevron-up"} size={16} />
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={allSelected ? clearAll : selectAll}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
            {selected.length > 0 && (
              <span className="text-xs text-slate-500">{selected.length} selected</span>
            )}
          </div>

          <div className={compact ? "space-y-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}>
            {options.map((opt) => {
              const isOn = selected.includes(opt.type);
              return (
                <label
                  key={opt.type}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isOn
                      ? "border-amber-500 bg-white"
                      : "border-slate-200 bg-white/60 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggle(opt.type)}
                    className="w-4 h-4 accent-amber-500 mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <Icon name={opt.icon} size={14} className="text-slate-500" />
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            We only share your details with verified advisors. You can opt out any time.
            See our <a href="/privacy" className="underline hover:text-slate-700">privacy policy</a>.
          </p>
        </>
      )}
    </div>
  );
}
