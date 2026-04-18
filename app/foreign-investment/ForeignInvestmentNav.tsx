import Link from "next/link";

const NAV_ITEMS = [
  { label: "Hub", href: "/foreign-investment", short: "Hub" },
  { label: "Guides", href: "/foreign-investment/guides", short: "Guides" },
  { label: "Shares", href: "/foreign-investment/shares", short: "Shares" },
  { label: "Energy", href: "/foreign-investment/energy", short: "Energy" },
  { label: "Property", href: "/foreign-investment/property", short: "Property" },
  { label: "Tax Guide", href: "/foreign-investment/tax", short: "Tax" },
  { label: "Super & DASP", href: "/foreign-investment/super", short: "Super" },
  { label: "Send Money", href: "/foreign-investment/send-money-australia", short: "Send $" },
  { label: "Non-Res Brokers", href: "/compare/non-residents", short: "Brokers" },
  { label: "By Country", href: "/foreign-investment/from/us", short: "Country" },
  { label: "Singapore", href: "/foreign-investment/singapore", short: "SG" },
  { label: "Hong Kong", href: "/foreign-investment/hong-kong", short: "HK" },
  { label: "UK", href: "/foreign-investment/united-kingdom", short: "UK" },
  { label: "UAE", href: "/foreign-investment/united-arab-emirates", short: "UAE" },
  { label: "China", href: "/foreign-investment/china", short: "CN" },
  { label: "Japan", href: "/foreign-investment/japan", short: "JP" },
  { label: "India", href: "/foreign-investment/india", short: "IN" },
  { label: "Malaysia", href: "/foreign-investment/malaysia", short: "MY" },
  { label: "New Zealand", href: "/foreign-investment/new-zealand", short: "NZ" },
  { label: "South Korea", href: "/foreign-investment/south-korea", short: "KR" },
  { label: "USA", href: "/foreign-investment/united-states", short: "US" },
  { label: "Saudi Arabia", href: "/foreign-investment/saudi-arabia", short: "SA" },
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
