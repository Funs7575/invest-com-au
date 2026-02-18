import Link from "next/link";
import { RISK_WARNING_CTA, PDS_CONSIDERATION } from "@/lib/compliance";

export default function CompactDisclaimerLine({ variant = "light" }: { variant?: "light" | "dark" }) {
  const textClass = variant === "dark" ? "text-white/50" : "text-slate-400";
  const linkClass = variant === "dark" ? "text-white/60 hover:text-white/80" : "text-slate-500 hover:text-slate-700";
  return (
    <p className={`text-[0.6rem] ${textClass} mt-3 leading-tight flex items-center gap-1 justify-center`}>
      <Link href="/how-we-earn" className={linkClass} title="Important disclaimers">
        <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
          <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4m0-4h.01"/>
        </svg>
      </Link>
      {RISK_WARNING_CTA} {PDS_CONSIDERATION}
    </p>
  );
}
