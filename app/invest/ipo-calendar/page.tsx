import Link from "next/link";
import type { Metadata } from "next";
import Icon from "@/components/Icon";
import NewsletterSignup from "@/components/NewsletterSignup";
import IpoWatchlistButton from "@/components/IpoWatchlistButton";
import { createClient } from "@/lib/supabase/server";
import {
  breadcrumbJsonLd,
  SITE_URL,
  SITE_NAME,
  CURRENT_YEAR,
} from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `ASX IPO Calendar (${CURRENT_YEAR}) — Upcoming Australian IPOs & Recent Listings`,
  description:
    "Track upcoming ASX IPOs and recent Australian listings. Broker priority allocations, retail allocation rules, lockup periods and first-day pop history.",
  alternates: { canonical: `${SITE_URL}/invest/ipo-calendar` },
  openGraph: {
    title: `ASX IPO Calendar (${CURRENT_YEAR})`,
    description:
      "Upcoming ASX IPOs, recently listed companies and how to access broker IPO allocations as a retail investor.",
    url: `${SITE_URL}/invest/ipo-calendar`,
  },
};

interface IpoOffer {
  id: number;
  asx_code: string | null;
  company_name: string;
  sector: string | null;
  offer_type: string;
  status: string;
  offer_open_date: string | null;
  offer_close_date: string | null;
  listing_date: string | null;
  issue_price_cents: number | null;
  amount_raised_cents: number | null;
  first_day_return_pct: number | null;
  note: string | null;
  description: string | null;
  prospectus_url: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Upcoming",
  open:      "Open now",
  closed:    "Closed",
  listed:    "Listed",
  withdrawn: "Withdrawn",
};

const STATUS_COLOR: Record<string, string> = {
  upcoming:  "bg-indigo-100 text-indigo-700 border-indigo-200",
  open:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed:    "bg-slate-100 text-slate-600 border-slate-200",
  listed:    "bg-blue-100 text-blue-700 border-blue-200",
  withdrawn: "bg-red-100 text-red-600 border-red-200",
};

function fmtPrice(cents: number | null): string {
  if (!cents) return "TBC";
  return "$" + (cents / 100).toFixed(2);
}

function fmtRaise(cents: number | null): string {
  if (!cents) return "TBC";
  const m = cents / 100 / 1_000_000;
  return m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${m.toFixed(0)}M`;
}

function fmtDate(d: string | null): string {
  if (!d) return "TBC";
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ACCESS_ROUTES = [
  {
    id: "broker-priority",
    label: "Broker priority allocations",
    body:
      "CommSec, nabtrade, Macquarie Direct, Morgans and Bell Direct receive priority allocations from corporate advisors managing the IPO. Eligible retail clients of those brokers can apply through the broker's IPO portal — typically a digital application 5–10 business days before the offer closes. Allocations are not guaranteed; oversubscribed IPOs are scaled back. Premium brokers (Morgans, Bell Direct) tend to receive larger retail allocations than discount brokers.",
    cta: { label: "Compare ASX brokers", href: "/compare?category=shares" },
  },
  {
    id: "broker-managed-offers",
    label: "Broker-managed offers",
    body:
      "Where a stockbroker is the lead manager or co-manager on an IPO, their clients receive priority. Morgans, Bell Potter, E&P (formerly Evans Dixon), Wilsons and Canaccord are the principal mid-cap IPO desks. To access these offers reliably you typically need a meaningful trading account or a private wealth relationship — retail accounts at these brokers see allocations on smaller IPOs and roll-overs, not the marquee deals.",
    cta: { label: "Find a private wealth manager", href: "/advisors/private-wealth-managers" },
  },
  {
    id: "general-public-offer",
    label: "General public offer",
    body:
      "Some IPOs include a general public offer accessible without a brokerage relationship — you complete the application form attached to the prospectus and pay by BPAY or cheque. Public offers are most common on smaller-cap (sub-$200M) ASX listings where the corporate advisor needs broad retail subscription to hit the minimum spread. ASIC requires every IPO to include a prospectus accessible via OnMarket, the company website and offerlists.",
    cta: { label: "Browse the prospectus library", href: "/invest/funds" },
  },
  {
    id: "onmarket",
    label: "OnMarket platform",
    body:
      "OnMarket is the dominant Australian platform aggregating public-offer IPOs and small-cap placements for retail investors. Free to register; no brokerage relationship required. The platform handles allocation, settlement and CHESS HIN cross-reference. Useful for accessing smaller deals where the discount broker channel doesn't get an allocation.",
    cta: { label: "Find a stockbroker", href: "/advisors/stockbroker-firms" },
  },
];

const FAQS = [
  {
    question: "How do I apply for an ASX IPO as a retail investor?",
    answer:
      "Three routes: through a broker that holds priority allocation (CommSec, nabtrade, Morgans, Bell Direct, Macquarie Direct), through a public offer attached to the prospectus by completing the application form and paying via BPAY, or through OnMarket which aggregates retail-eligible offers. Most marquee ASX IPOs are channelled through brokers with priority allocation rather than public offers.",
  },
  {
    question: "How are retail vs institutional allocations split?",
    answer:
      "Retail allocations on Australian IPOs typically run 5%–15% of the total raise, depending on size and demand profile. Institutional allocation (priority bookbuild) takes the bulk. Larger IPOs above $500M raise typically have higher retail allocations because the retail tail is needed for spread requirements; smaller mid-cap IPOs often allocate >90% to institutions and broker-priority retail.",
  },
  {
    question: "What is a lockup period and why does it matter?",
    answer:
      "Lockups (also called escrow) restrict pre-IPO shareholders — founders, employees, pre-IPO investors and advisors — from selling shares for a defined period after listing, usually 6, 12 or 24 months. ASX-imposed escrow applies to vendors of mining and biotech companies that listed via prospectus assets. Discretionary escrow is negotiated by the corporate advisor as part of the IPO. Lockup expiry days frequently trigger meaningful share-price selling pressure as escrowed holders sell.",
  },
  {
    question: "How do ASX IPOs perform vs the index historically?",
    answer:
      "Australian IPO first-day returns average around 7%–10% across the long-run historical record (ASIC, Aussie IPO and the SIRCA database), but median first-day return is closer to flat — averages are skewed by the tail of high-pop deals. 12-month post-IPO returns are mixed — IPOs underperform the ASX 200 over the medium term on average, with significant dispersion. Picking IPOs that beat the index requires real research; passive IPO exposure does not historically pay.",
  },
  {
    question: "Can I get an allocation as a small retail investor?",
    answer:
      "Yes for general public offers (apply via prospectus or OnMarket), and for smaller-cap IPOs through CommSec, nabtrade and OnMarket where minimum applications start at $1,000–$2,500. Marquee large-cap IPOs (DigiCo, GYG-style) are heavily oversubscribed and retail allocations are scaled meaningfully — you may apply for $20,000 and receive $2,000. A private wealth or premium-broker relationship is the practical route to consistent allocations on the bigger deals.",
  },
  {
    question: "What's the tax treatment of IPO shares?",
    answer:
      "Shares acquired via IPO are treated as standard share acquisitions for CGT purposes — cost base is the issue price. Selling within 12 months attracts the full CGT rate at your marginal income; 50% CGT discount applies after 12 months for individuals. Stag-trade strategies (selling on day one) realise the gain at full marginal rate. IPOs settled via SRN rather than CHESS HIN have separate tax administration — most retail subscribers receive CHESS-sponsored shares through their broker.",
  },
  {
    question: "Do all ASX IPOs include a public offer?",
    answer:
      "No. Many ASX IPOs are placement-only or broker-firm-only — accessible only to clients of the lead and co-managers and to wholesale investors via the institutional bookbuild. Public offers are more common on smaller cap and on raises where the corporate advisor wants broad retail spread. Read the prospectus front-cover allocation note to check whether a public offer is included.",
  },
];

export default async function IpoCalendarPage() {
  const supabase = await createClient();

  const { data: ipoData } = await supabase
    .from("ipo_offers")
    .select(
      "id, asx_code, company_name, sector, offer_type, status, offer_open_date, offer_close_date, listing_date, issue_price_cents, amount_raised_cents, first_day_return_pct, note, description, prospectus_url",
    )
    .eq("is_published", true)
    .order("listing_date", { ascending: false, nullsFirst: true })
    .limit(100);

  const offers = (ipoData ?? []) as IpoOffer[];
  const upcoming = offers.filter((o) => o.status === "upcoming" || o.status === "open");
  const recent = offers.filter((o) => o.status === "listed" || o.status === "closed");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "ASX IPO Calendar" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `ASX IPO Calendar (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/ipo-calendar`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-6"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">
              Invest
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">ASX IPO Calendar</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              Calendar
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Independent research
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            ASX IPO Calendar
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mb-6">
            Upcoming Australian IPOs, recent listings and how to access ASX
            offers as a retail investor — broker priority allocations,
            public offers, OnMarket aggregation and lockup mechanics.
          </p>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
            {[
              { label: "ASX IPOs YTD (approx)", value: "~30" },
              { label: "Average first-day return", value: "7–10%" },
              { label: "Typical retail allocation", value: "5–15%" },
              { label: "Public-offer minimum", value: "$1K–$2.5K" },
            ].map((s) => (
              <div
                key={s.label}
                className="border border-slate-200 rounded-lg bg-slate-50 px-3 py-2"
              >
                <dt className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">
                  {s.label}
                </dt>
                <dd className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-[11px] text-slate-400 mt-3 max-w-2xl">
            Sources: ASX listing data, ASIC IPO Outcomes report. YTD count and
            first-day return ranges are editorially reviewed snapshots.
          </p>
        </div>
      </section>

      {/* Upcoming IPOs */}
      {upcoming.length > 0 && (
        <section className="py-10 md:py-12 bg-white border-b border-slate-100" id="upcoming">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              Upcoming & open now
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Upcoming ASX IPOs
            </h2>

            <div className="space-y-3">
              {upcoming.map((ipo) => (
                <div
                  key={ipo.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {ipo.asx_code && (
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          {ipo.asx_code}
                        </span>
                      )}
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[ipo.status] ?? STATUS_COLOR.upcoming}`}
                      >
                        {STATUS_LABEL[ipo.status] ?? ipo.status}
                      </span>
                      {ipo.sector && (
                        <span className="text-xs text-slate-500">{ipo.sector}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5">{ipo.company_name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 mt-1">
                      {ipo.offer_open_date && (
                        <span>Opens: {fmtDate(ipo.offer_open_date)}</span>
                      )}
                      {ipo.offer_close_date && (
                        <span>Closes: {fmtDate(ipo.offer_close_date)}</span>
                      )}
                      {ipo.listing_date && (
                        <span>Lists: {fmtDate(ipo.listing_date)}</span>
                      )}
                      {ipo.issue_price_cents !== null && (
                        <span>Issue price: {fmtPrice(ipo.issue_price_cents)}</span>
                      )}
                      {ipo.amount_raised_cents !== null && (
                        <span>Raise: {fmtRaise(ipo.amount_raised_cents)}</span>
                      )}
                    </div>
                    {ipo.note && (
                      <p className="text-xs text-slate-500 mt-1">{ipo.note}</p>
                    )}
                    {ipo.prospectus_url && (
                      <Link
                        href={ipo.prospectus_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                      >
                        View prospectus →
                      </Link>
                    )}
                  </div>
                  <IpoWatchlistButton
                    ipoId={ipo.id}
                    alertType="listing"
                    className="w-8 h-8 shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How to access ASX IPOs */}
      <section className="py-10 md:py-12 bg-white" id="how-to-access">
        <div className="container-custom">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              Section 1 &middot; Four access routes
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              How to access ASX IPOs as a retail investor
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Allocation mechanics differ meaningfully between marquee and
              small-cap IPOs. The right access route depends on the deal size,
              your broker relationship and whether the offer includes a public
              offer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ACCESS_ROUTES.map((w, i) => (
              <div
                key={w.id}
                id={w.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5 scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{w.label}</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  {w.body}
                </p>
                <Link
                  href={w.cta.href}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  {w.cta.label}
                  <Icon name="bookmark" size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent listings */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-100" id="recent-listings">
        <div className="container-custom max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            Section 2 &middot; Recent ASX listings
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
            Recently listed (last 12 months)
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-2xl">
            Editorially compiled snapshot of meaningful ASX IPOs. New listings
            are added as prospectuses are lodged.
          </p>

          {recent.length > 0 ? (
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700">Code</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700">Company</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700">Sector</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700">Listed</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700">Issue</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700">Raised</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((ipo, i) => (
                    <tr
                      key={ipo.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                    >
                      <td className="py-3 px-4 font-bold text-indigo-700 border-b border-slate-100">
                        {ipo.asx_code ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-800 border-b border-slate-100">
                        <div className="font-semibold">{ipo.company_name}</div>
                        {ipo.note && (
                          <div className="text-xs text-slate-500 mt-0.5">{ipo.note}</div>
                        )}
                        {ipo.first_day_return_pct !== null && (
                          <div className={`text-xs font-semibold mt-0.5 ${ipo.first_day_return_pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            Day-1: {ipo.first_day_return_pct >= 0 ? "+" : ""}{ipo.first_day_return_pct.toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 border-b border-slate-100">
                        {ipo.sector ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 border-b border-slate-100">
                        {fmtDate(ipo.listing_date)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 border-b border-slate-100 tabular-nums">
                        {fmtPrice(ipo.issue_price_cents)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 border-b border-slate-100 tabular-nums">
                        {fmtRaise(ipo.amount_raised_cents)}
                      </td>
                      <td className="py-3 px-4 border-b border-slate-100">
                        <IpoWatchlistButton
                          ipoId={ipo.id}
                          alertType="listing"
                          className="w-7 h-7"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No recent listings found. Check back soon.</p>
          )}

          <p className="text-[11px] text-slate-400 mt-3">
            Data is editorially compiled and reviewed; market data moves
            intraday and historical IPO data is sourced from public ASX
            announcements.
          </p>
        </div>
      </section>

      {/* Newsletter signup */}
      <section className="py-10 md:py-12 bg-white" id="alerts">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            Section 3 &middot; Get IPO alerts
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            ASX IPO alerts &amp; subscriptions
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Get a weekly email summary of upcoming ASX IPOs, recently lodged
            prospectuses and broker priority-allocation windows.
          </p>

          <NewsletterSignup
            heading="ASX IPO Calendar — Weekly"
            body="Upcoming IPOs, prospectus lodgements and recent listing performance — short, no spam, unsubscribe any time."
            source="ipo-calendar"
            variant="full"
          />
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-100" id="faqs">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            Section 4 &middot; FAQs
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
            ASX IPO investing — frequently asked
          </h2>

          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.question}
                className="group bg-white border border-slate-200 rounded-xl px-5 py-4"
              >
                <summary className="cursor-pointer font-bold text-slate-900 text-sm md:text-base flex items-start justify-between gap-3">
                  <span>{f.question}</span>
                  <Icon
                    name="plus"
                    size={18}
                    className="text-slate-400 group-open:rotate-45 transition-transform shrink-0 mt-0.5"
                  />
                </summary>
                <p className="text-sm text-slate-700 leading-relaxed mt-3">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <section className="py-12 md:py-14 bg-slate-900 text-white" id="find-advisor">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
            Section 5 &middot; Get specialist help
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Speak with a stockbroker for IPO access
          </h2>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Consistent IPO allocations on marquee deals come through full-service
            stockbrokers and private wealth managers — not discount platforms.
            Our directory is filtered to firms with active IPO desk presence
            and disclosed allocation history.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href="/advisors/stockbroker-firms"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="trophy" size={20} className="text-indigo-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300">
                  Stockbroker firms
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Full-service stockbrokers (Morgans, Bell Potter, Wilsons,
                Canaccord) with active IPO desks and broker-priority retail
                allocations.
              </p>
            </Link>

            <Link
              href="/advisors/private-wealth-managers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="briefcase" size={20} className="text-indigo-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300">
                  Private wealth managers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Private banks and wealth managers (UBS, Macquarie, Morgan
                Stanley, JBWere) with consistent access to mid and large-cap
                ASX IPO allocations.
              </p>
            </Link>
          </div>

          <Link
            href="/find-advisor?focus=ipos"
            className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
          >
            Match me with an adviser
            <Icon name="bookmark" size={16} />
          </Link>
        </div>
      </section>

      {/* Compliance footer */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong className="text-slate-600">General Advice Warning:</strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
