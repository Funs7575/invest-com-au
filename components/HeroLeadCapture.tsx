"use client";

import Link from "next/link";
import Icon from "@/components/Icon";

const options = [
  {
    href: "/advisors/mortgage-brokers",
    icon: "home",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    label: "Buy a Home",
    sub: "Mortgage Brokers",
    hoverBorder: "hover:border-blue-600",
    hoverBg: "hover:bg-blue-50",
  },
  {
    href: "/advisors/buyers-agents",
    icon: "building",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    label: "Invest in Property",
    sub: "Buyer's Agents",
    hoverBorder: "hover:border-blue-600",
    hoverBg: "hover:bg-blue-50",
  },
  {
    href: "/advisors/financial-planners",
    icon: "trending-up",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    label: "Grow Wealth",
    sub: "Financial Planners",
    hoverBorder: "hover:border-blue-600",
    hoverBg: "hover:bg-blue-50",
  },
  {
    href: "/advisors/smsf-accountants",
    icon: "briefcase",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    label: "Manage SMSF",
    sub: "Specialist Accountants",
    hoverBorder: "hover:border-blue-600",
    hoverBg: "hover:bg-blue-50",
  },
];

export default function HeroLeadCapture() {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 lg:p-8 border border-slate-200">
      <h2 className="text-xl font-bold mb-6 text-slate-900 border-b border-slate-100 pb-4">
        What do you need help with today?
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {options.map((opt) => (
          <Link
            key={opt.href}
            href={opt.href}
            className={`flex flex-col items-center text-center p-5 border-2 border-slate-100 rounded-xl ${opt.hoverBorder} ${opt.hoverBg} hover:shadow-md transition-all group`}
          >
            <div className={`${opt.iconBg} p-3 rounded-full mb-4 group-hover:scale-110 transition-transform`}>
              <Icon name={opt.icon} size={28} className={opt.iconColor} />
            </div>
            <span className="font-bold text-slate-900 mb-1">{opt.label}</span>
            <span className="text-xs text-slate-500">{opt.sub}</span>
          </Link>
        ))}
      </div>

      {/* Day 1 Trust & Privacy Signal */}
      <div className="mt-6 pt-4 text-center">
        <p className="text-sm text-slate-500 flex items-center justify-center gap-1.5">
          <Icon name="shield-check" size={16} className="text-blue-500" />
          Your details are secure and sent to exactly{" "}
          <strong className="text-slate-700">one verified match</strong>.
        </p>
      </div>
    </div>
  );
}
