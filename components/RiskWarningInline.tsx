import { RISK_WARNING_CTA } from "@/lib/compliance";

export default function RiskWarningInline({ variant = "light" }: { variant?: "light" | "dark" }) {
  return (
    <p className={`text-[0.6rem] md:text-xs mt-0.5 md:mt-1 leading-tight ${variant === "dark" ? "text-white/60" : "text-slate-400"}`}>
      {RISK_WARNING_CTA}
    </p>
  );
}
