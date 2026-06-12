import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `How to Transfer From Your Current Broker (${CURRENT_YEAR}) — Step-by-Step Guides`,
  description:
    "Transfer shares, ETFs and cash out of every major broker. CHESS transfer fees, in-specie support, exit fees, and realistic timelines.",
  alternates: { canonical: `${SITE_URL}/how-to/transfer-from` },
};

interface GuideRow {
  id: number;
  broker_slug: string;
  transfer_type: string | null;
  chess_transfer_fee: number | null;
  supports_in_specie: boolean | null;
  estimated_timeline_days: number | null;
}

interface BrokerRow {
  slug: string;
  name: string;
  logo_url: string | null;
}

async function fetchGuides(): Promise<GuideRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("broker_transfer_guides")
      .select(
        "id, broker_slug, transfer_type, chess_transfer_fee, supports_in_specie, estimated_timeline_days",
      )
      .order("broker_slug", { ascending: true });
    return (data as GuideRow[] | null) || [];
  } catch {
    return [];
  }
}

async function fetchBrokers(slugs: string[]): Promise<Record<string, BrokerRow>> {
  if (slugs.length === 0) return {};
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("slug, name, logo_url")
      .in("slug", slugs);
    const map: Record<string, BrokerRow> = {};
    for (const b of (data || []) as BrokerRow[]) map[b.slug] = b;
    return map;
  } catch {
    return {};
  }
}

function formatFee(cents: number | null): string {
  if (cents == null) return "—";
  if (cents === 0) return "Free";
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

const TRANSFER_FROM_FAQS = [
  {
    q: "How do I transfer my shares from one Australian broker to another?",
    a: "For ASX shares held in your own CHESS-sponsored account (with an HIN), transferring to a new broker is an in-specie CHESS transfer: the new broker initiates the transfer from CHESS on your behalf, no sale occurs, and your cost base is preserved. You will need to provide your HIN and SRN (securityholder reference number) to the new broker. Most CHESS in-specie transfers complete within 3–10 business days. For shares held in a custodial (sponsored) account — common with international brokers like IBKR or some fintechs — the process differs and may require a sale-and-rebuy, which is a CGT event.",
  },
  {
    q: "Does transferring shares trigger capital gains tax?",
    a: "A CHESS in-specie transfer does NOT trigger a CGT disposal event — the shares move between brokers without being sold. Your original acquisition date and cost base are preserved in the new broker's system. However, if your shares are held in a custodial (non-CHESS) structure — where the broker is the registered holder, not you — transferring them out may require selling and rebuying at the new broker, which DOES trigger a CGT event at current market prices. Check which holding structure your broker uses before initiating a transfer.",
  },
  {
    q: "What fees apply when transferring shares between brokers?",
    a: "CHESS in-specie transfer fees vary by broker. Some brokers charge a per-holding fee (e.g. $20–$55 per security transferred out), while others charge per transfer ($50–$100 flat). A few brokers offer free outgoing transfers as a competitive differentiator. The new (receiving) broker typically charges nothing. Check each broker's full transfer-out fee schedule before initiating — the guide for your specific broker on this page shows the current fees and any applicable conditions.",
  },
  {
    q: "How long does a broker transfer take?",
    a: "CHESS in-specie transfers between Australian brokers typically take 3–10 business days from initiation to completion. The process involves the receiving broker requesting the holdings from CHESS, the original broker releasing the securities, and CHESS updating the registered holder. During this period your holdings are locked — you cannot sell, buy, or receive dividends credited to the position until the transfer completes. For international share positions held in custodial accounts (ACATS transfers), allow 4–6 business days for US-listed securities.",
  },
];

const transferFromFaqLd = faqJsonLd(TRANSFER_FROM_FAQS);

export default async function TransferFromIndex() {
  const guides = await fetchGuides();
  const brokerMap = await fetchBrokers(guides.map((g) => g.broker_slug));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "How to", url: `${SITE_URL}/how-to` },
    { name: "Transfer from" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {transferFromFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(transferFromFaqLd) }}
        />
      )}
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/how-to" className="hover:text-white">How to</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Transfer from</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Transfer your shares &amp; cash to a better broker
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Step-by-step guides for every major Australian broker — CHESS transfer fees, in-specie support, realistic timelines, and the paperwork you&rsquo;ll need.
            </p>
          </div>
        </section>

        <section className="py-10 bg-white">
          <div className="container-custom max-w-5xl">
            {guides.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm text-slate-500">
                  No transfer guides published yet. Check back soon.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table aria-label="Broker share transfer guides: CHESS fees, in-specie support, and timelines" className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="text-left px-4 py-3 font-bold text-slate-700">From</th>
                      <th scope="col" className="text-left px-4 py-3 font-bold text-slate-700 hidden md:table-cell">CHESS transfer fee</th>
                      <th scope="col" className="text-left px-4 py-3 font-bold text-slate-700 hidden md:table-cell">In-specie</th>
                      <th scope="col" className="text-left px-4 py-3 font-bold text-slate-700 hidden lg:table-cell">Timeline</th>
                      <th scope="col" className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guides.map((g) => {
                      const broker = brokerMap[g.broker_slug];
                      return (
                        <tr key={g.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">
                              {broker?.name ?? g.broker_slug}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-700 tabular-nums hidden md:table-cell">
                            {formatFee(g.chess_transfer_fee)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 hidden md:table-cell">
                            {g.supports_in_specie ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3 text-slate-700 hidden lg:table-cell">
                            {g.estimated_timeline_days
                              ? `${g.estimated_timeline_days} days`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Link
                              href={`/how-to/transfer-from/${g.broker_slug}`}
                              className="text-amber-600 hover:underline text-xs font-bold inline-flex items-center gap-1"
                            >
                              View guide
                              <Icon name="arrow-right" size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="container-custom max-w-5xl mt-10 border-t border-slate-200 pt-8 pb-10">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {TRANSFER_FROM_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
