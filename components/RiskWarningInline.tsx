import { RISK_WARNING_CTA } from "@/lib/compliance";

export default function RiskWarningInline() {
  return (
    <p className="text-[0.6rem] text-slate-400 mt-1 leading-tight">
      {RISK_WARNING_CTA}
    </p>
  );
}
