import Link from "next/link";
import { PROPERTY_DISCLAIMER_SHORT } from "@/lib/compliance";

export default function PropertyDisclaimer() {
  return (
    <p className="text-[0.62rem] md:text-xs text-slate-400 mt-3 leading-tight flex items-center gap-1 justify-center">
      <Link href="/terms" className="text-slate-500 hover:text-slate-700" title="Important disclaimers" aria-label="Important disclaimers">
        <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
          <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4m0-4h.01"/>
        </svg>
      </Link>
      {PROPERTY_DISCLAIMER_SHORT}
    </p>
  );
}
