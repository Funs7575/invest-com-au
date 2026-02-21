import Link from "next/link";
import Icon from "@/components/Icon";

const popularPages = [
  { title: "Compare Brokers", description: "Side-by-side fee comparison of 40+ platforms", href: "/compare", icon: "bar-chart" },
  { title: "Head-to-Head", description: "Pick two brokers and see who wins", href: "/versus", icon: "swords" },
  { title: "Calculators", description: "Franking credits, FX fees, CGT & more", href: "/calculators", icon: "calculator" },
  { title: "Broker Quiz", description: "Get matched in 60 seconds", href: "/quiz", icon: "target" },
  { title: "Articles", description: "Guides on buying shares, fees & more", href: "/articles", icon: "file-text" },
  { title: "Scenarios", description: "Best brokers for beginners, SMSF, etc.", href: "/scenarios", icon: "building" },
];

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-2xl w-full">
        <Icon name="search" size={48} className="text-slate-300 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Page Not Found</h1>
        <p className="text-slate-600 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center mb-12">
          <Link
            href="/"
            className="px-6 py-2.5 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/compare"
            className="px-6 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Compare Brokers
          </Link>
        </div>

        {/* Popular Pages */}
        <div className="border-t border-slate-200 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Popular Pages
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {popularPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="block border border-slate-200 rounded-xl p-4 text-left hover-lift"
              >
                <Icon name={page.icon} size={24} className="text-green-700 mb-1" />
                <h3 className="font-bold text-sm mb-0.5">{page.title}</h3>
                <p className="text-xs text-slate-500">{page.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
