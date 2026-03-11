"use client";

import dynamic from "next/dynamic";
import type { Broker } from "@/lib/types";

const SavingsCalculatorClient = dynamic(
  () => import("@/app/savings-calculator/SavingsCalculatorClient"),
  { loading: () => <div className="p-8 text-center text-slate-400 text-sm">Loading calculator...</div> }
);

export default function InlineSavingsCalc({ brokers }: { brokers: Broker[] }) {
  const accounts = brokers
    .filter(b => b.platform_type === "savings_account" || b.platform_type === "term_deposit")
    .map(b => ({
      id: b.id, slug: b.slug, name: b.name,
      platform_type: b.platform_type || "",
      asx_fee: b.asx_fee || "", rating: b.rating,
      affiliate_url: b.affiliate_url || "",
      color: b.color || "", min_deposit: b.min_deposit || "",
    }));

  return (
    <div>
      <h2 className="text-base md:text-2xl font-bold mb-0.5 md:mb-1">Savings Calculator</h2>
      <p className="text-[0.69rem] md:text-sm text-slate-500 mb-3 md:mb-6">
        Are you earning enough interest? Compare your rate against the best accounts.
      </p>
      <SavingsCalculatorClient accounts={accounts as never} inline />
    </div>
  );
}
