import { RISK_WARNING_CTA } from "@/lib/compliance";

export default function RiskWarningInline({ variant = "light" }: { variant?: "light" | "dark" }) {
  return (
    <p className={`text-xs mt-1 leading-tight ${variant === "dark" ? "text-white/60" : "text-slate-500"}`}>
      {RISK_WARNING_CTA}
    </p>
  );
}
