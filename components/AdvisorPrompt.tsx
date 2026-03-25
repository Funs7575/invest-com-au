import Link from "next/link";
import Icon from "@/components/Icon";
import type { ProfessionalType } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

interface AdvisorPromptProps {
  /** Which advisor type to suggest */
  type?: ProfessionalType;
  /** Custom heading */
  heading?: string;
  /** Custom description */
  description?: string;
  /** Contextual trigger reason */
  context?: "smsf" | "high-value" | "tax" | "property" | "general";
  /** Compact variant for inline use */
  compact?: boolean;
}

const CONTEXT_CONFIG: Record<string, { heading: string; description: string; type: ProfessionalType; icon: string }> = {
  smsf: {
    heading: "Setting up an SMSF?",
    description: "You'll need a specialist SMSF accountant for setup, compliance, and annual audits.",
    type: "smsf_accountant",
    icon: "building",
  },
  "high-value": {
    heading: "Investing $100k+?",
    description: "A one-off financial plan could save thousands in tax and optimise your portfolio structure.",
    type: "financial_planner",
    icon: "trending-up",
  },
  tax: {
    heading: "Capital gains adding up?",
    description: "A tax agent who specialises in investments can help minimise your CGT liability.",
    type: "tax_agent",
    icon: "calculator",
  },
  property: {
    heading: "Considering property investment?",
    description: "A property advisor can help you assess whether to invest in property, shares, or both.",
    type: "property_advisor",
    icon: "home",
  },
  general: {
    heading: "Need professional advice?",
    description: "Browse verified financial professionals — free consultation requests, no obligation.",
    type: "financial_planner",
    icon: "briefcase",
  },
};

const GUIDE_MAP: Partial<Record<ProfessionalType, string>> = {
  smsf_accountant: "/advisor-guides/how-to-choose-smsf-accountant",
  financial_planner: "/advisor-guides/how-to-choose-financial-planner",
  tax_agent: "/advisor-guides/how-to-choose-tax-agent-investments",
  property_advisor: "/advisor-guides/how-to-choose-property-investment-advisor",
  mortgage_broker: "/advisor-guides/how-to-choose-mortgage-broker",
  estate_planner: "/advisor-guides/how-to-choose-estate-planner",
};

export default function AdvisorPrompt({ type, heading, description, context = "general", compact = false }: AdvisorPromptProps) {
  const config = CONTEXT_CONFIG[context] || CONTEXT_CONFIG.general;
  const advisorType = type || config.type;
  const typeLabel = PROFESSIONAL_TYPE_LABELS[advisorType];
  const displayHeading = heading || config.heading;
  const displayDesc = description || config.description;

  if (compact) {
    return (
      <Link
        href={`/advisors?type=${advisorType}`}
        className="flex items-center gap-2.5 p-2.5 md:p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-100 transition-all group"
      >
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
          <Icon name={config.icon} size={14} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-900">{displayHeading}</div>
          <div className="text-[0.58rem] md:text-[0.62rem] text-slate-500 truncate">Browse {typeLabel.toLowerCase()}s →</div>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200/60 rounded-xl p-3.5 md:p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Icon name={config.icon} size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-bold text-slate-900 mb-0.5">{displayHeading}</h3>
          <p className="text-xs md:text-sm text-slate-500 mb-3 leading-relaxed">{displayDesc}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/advisors?type=${advisorType}`}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-900 text-white text-[0.65rem] md:text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Browse {typeLabel}s →
            </Link>
            {GUIDE_MAP[advisorType] && (
              <Link
                href={GUIDE_MAP[advisorType]!}
                className="px-3 py-1.5 md:px-4 md:py-2 border border-slate-200 text-slate-600 text-[0.65rem] md:text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                How to Choose →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
