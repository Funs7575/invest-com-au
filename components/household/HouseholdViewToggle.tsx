"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

/**
 * HouseholdViewToggle — "Mine / Household" segmented control for combined
 * views (/account/net-worth, /account/goals). Flips the `?view=` search param;
 * the server component re-reads it and merges in the partner's shared rows.
 *
 * Pure UI — no server imports — safe in the client bundle. Only rendered when
 * the caller (a server component) has confirmed the flag is on AND the user is
 * in a household with an accepted partner.
 */

export default function HouseholdViewToggle({
  active,
  partnerLabel,
}: {
  active: "mine" | "household";
  partnerLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setView(view: "mine" | "household") {
    const next = new URLSearchParams(params?.toString());
    if (view === "household") next.set("view", "household");
    else next.delete("view");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      role="group"
      aria-label="Whose data to show"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold"
    >
      <button
        type="button"
        aria-pressed={active === "mine"}
        onClick={() => setView("mine")}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          active === "mine"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Just me
      </button>
      <button
        type="button"
        aria-pressed={active === "household"}
        onClick={() => setView("household")}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          active === "household"
            ? "bg-white text-violet-800 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Household
      </button>
      <span className="sr-only">
        Household combines your shared items with {partnerLabel}&apos;s shared
        items.
      </span>
    </div>
  );
}
