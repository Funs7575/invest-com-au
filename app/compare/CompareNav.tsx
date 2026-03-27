import Link from "next/link";

const NAV_ITEMS = [
  { label: "All Platforms", href: "/compare", short: "All" },
  { label: "ETFs", href: "/compare/etfs", short: "ETFs" },
  { label: "Super Funds", href: "/compare/super", short: "Super" },
  { label: "Insurance", href: "/compare/insurance", short: "Insurance" },
];

interface Props {
  current: string; // matches href
}

export default function CompareNav({ current }: Props) {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="container-custom">
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none" aria-label="Compare sections">
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
