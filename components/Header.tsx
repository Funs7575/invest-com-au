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
  );
}
