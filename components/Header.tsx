import Link from "next/link";

export default function Header() {
  const navItems = [
    { name: "Brokers", href: "/compare" },
    { name: "Versus", href: "/versus" },
    { name: "Reviews", href: "/reviews" },
    { name: "Calculators", href: "/calculators" },
    { name: "Articles", href: "/articles" },
    { name: "Scenarios", href: "/scenarios" },
    { name: "About", href: "/about" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold text-brand">
              Invest<span className="text-amber">.com.au</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-slate-700 hover:text-brand transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Quick Nav Bar */}
      <div className="sticky top-[64px] z-40 bg-slate-800 border-b border-slate-700 overflow-x-auto">
        <div className="container-custom">
          <div className="flex items-center gap-4 py-2 text-xs text-slate-300">
            <span className="font-semibold text-slate-400 whitespace-nowrap">Popular:</span>
            <Link href="/versus?vs=stake,commsec" className="whitespace-nowrap hover:text-amber transition-colors">
              Stake vs CommSec
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/calculators?calc=franking" className="whitespace-nowrap hover:text-amber transition-colors">
              Franking Calculator
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/articles/how-to-buy-shares" className="whitespace-nowrap hover:text-amber transition-colors">
              How to Buy Shares
            </Link>
            <span className="text-slate-600">•</span>
            <Link href="/scenarios/smsf" className="whitespace-nowrap hover:text-amber transition-colors">
              SMSF Brokers
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
