import Link from "next/link";
import Icon from "@/components/Icon";

interface CtaLink {
  href: string;
  label: string;
}

interface RouteNotFoundProps {
  iconName: string;
  title: string;
  description: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  popular?: CtaLink[];
}

// Shared not-found primitive for co-located per-segment not-found.tsx boundaries.
// Without a boundary in the route chain, `notFound()` falls back to the root
// boundary, which the @netlify/plugin-nextjs runtime serves as a 500 ("Server
// Error") instead of a graceful not-found page. Mirrors the layout that
// app/compare/[versus]/not-found.tsx pioneered so every dynamic route degrades
// the same way.
export default function RouteNotFound({
  iconName,
  title,
  description,
  primaryCta,
  secondaryCta,
  popular,
}: RouteNotFoundProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name={iconName} size={28} className="text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 mb-6">{description}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href={primaryCta.href}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center"
          >
            {primaryCta.label}
          </Link>
          <Link
            href={secondaryCta.href}
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center"
          >
            {secondaryCta.label}
          </Link>
        </div>
        {popular && popular.length > 0 ? (
          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Popular links</p>
            <div className="flex flex-wrap justify-center gap-2">
              {popular.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
