import Link from "next/link";

const NAV_ITEMS = [
  { label: "Hub", href: "/foreign-investment", short: "Hub" },
  { label: "Shares", href: "/foreign-investment/shares", short: "Shares" },
  { label: "Crypto", href: "/foreign-investment/crypto", short: "Crypto" },
  { label: "Savings", href: "/foreign-investment/savings", short: "Savings" },
  { label: "Super & DASP", href: "/foreign-investment/super", short: "Super" },
  { label: "CFD & Forex", href: "/foreign-investment/cfd", short: "CFD" },
  { label: "Property", href: "/foreign-investment/property", short: "Property" },
  { label: "Tax Guide", href: "/foreign-investment/tax", short: "Tax" },
  { label: "By Country", href: "/foreign-investment/from/us", short: "Country" },
  { label: "Best Platforms", href: "/best/foreign-investors", short: "Platforms" },
];

interface Props {
  current: string; // matches href e.g. "/foreign-investment/shares"
}

export default function ForeignInvestmentNav({ current }: Props) {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="container-custom">
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none py-0" aria-label="Foreign investment sections">
          {NAV_ITEMS.map((item) => {
            const active = item.href === current;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.short}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
