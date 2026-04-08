import Link from "next/link";
import Icon from "@/components/Icon";

type ProUpsellVariant = "fee-alert" | "calculator" | "comparison" | "course" | "inline";

interface ProUpsellProps {
  variant: ProUpsellVariant;
  className?: string;
}

const VARIANTS: Record<ProUpsellVariant, { icon: string; title: string; desc: string; cta: string }> = {
  "fee-alert": {
    icon: "bell",
    title: "Never Overpay Again",
    desc: "Pro members get instant alerts when their broker changes fees. Set it and forget it.",
    cta: "Get Fee Alerts — $9/mo",
  },
  "calculator": {
    icon: "calculator",
    title: "See All Results",
    desc: "Free users see the top 3 results. Pro members see the full breakdown across all 73 platforms.",
    cta: "Unlock Full Results — $9/mo",
  },
  "comparison": {
    icon: "bar-chart",
    title: "Advanced Comparison Tools",
    desc: "Export comparisons, custom filters, and side-by-side deep dives on any 2 platforms.",
    cta: "Upgrade to Pro — $9/mo",
  },
  "course": {
    icon: "book-open",
    title: "Learn to Invest Smarter",
    desc: "Access premium courses from Australian market professionals. From beginner to advanced.",
    cta: "Start Learning — $9/mo",
  },
  "inline": {
    icon: "zap",
    title: "Investor Pro",
    desc: "Fee alerts, advanced tools, monthly market brief, and an ad-free experience.",
    cta: "$9/mo →",
  },
};

export default function ProUpsell({ variant, className = "" }: ProUpsellProps) {
  const v = VARIANTS[variant];

  if (variant === "inline") {
    return (
      <Link href="/pro" className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-lg hover:border-violet-400 transition-all group ${className}`}>
        <Icon name={v.icon} size={14} className="text-violet-500" />
        <span className="text-xs text-slate-600 flex-1">{v.desc}</span>
        <span className="text-xs font-bold text-violet-600 group-hover:text-violet-800 shrink-0">{v.cta}</span>
      </Link>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 md:p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
          <Icon name={v.icon} size={18} className="text-violet-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-violet-900 mb-0.5">{v.title}</h3>
          <p className="text-xs text-slate-600 mb-3">{v.desc}</p>
          <Link href="/pro" className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all">
            {v.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
