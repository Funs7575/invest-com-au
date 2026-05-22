import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `How to Transfer From Your Current Broker (${CURRENT_YEAR}) — Step-by-Step Guides`,
  description:
    "Step-by-step guides for transferring shares, ETFs and cash out of every major Australian broker. Chess transfer fees, in-specie support, exit fees and realistic timelines.",
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

const TRANSFER_FROM_FAQ = faqJsonLd([
  {
    q: "How do I transfer shares between Australian brokers?",
    a: "To transfer Australian shares (CHESS-sponsored holdings) to a new broker, you initiate a CHESS transfer from your new broker's platform. You'll need your Holder Identification Number (HIN) from your current broker and the CHESS transfer form. The new broker submits the request to ASX; the transfer typically completes in 2–7 business days. Some brokers charge a per-holding transfer fee of $25–$55.",
  },
  {
    q: "What is an in-specie transfer and which brokers support it?",
    a: "An in-specie transfer moves your holdings — shares, ETFs, or managed funds — directly to a new broker without selling them. This avoids triggering capital gains tax. Not all brokers support in-specie transfers; some only accept cash. Brokers that accept in-specie typically require a formal transfer form and may charge a flat fee per holding. Check the individual broker guide for support and fees before initiating.",
  },
  {
    q: "How long does a broker transfer take in Australia?",
    a: "CHESS transfers of ASX-listed shares typically complete in 2–7 business days once the transfer instruction is submitted. Cash transfers between brokers (BPAY or bank transfer after selling) settle in 1–3 business days. Some brokers quote up to 10–15 business days for complex or bulk transfers, particularly around end of financial year.",
  },
  {
    q: "Will I pay capital gains tax when switching brokers?",
    a: "Only if you sell your holdings before transferring. An in-specie transfer preserves your original cost base and does not trigger a CGT event — you simply move the asset from one broker to another. If you sell first (because in-specie is not supported), a CGT event occurs in the year of sale. For assets held longer than 12 months, the 50% CGT discount applies for Australian residents.",
  },
  {
    q: "Can I transfer ETFs and managed funds between brokers?",
    a: "ASX-listed ETFs (such as VAS, IOZ, NDQ) are CHESS-sponsored securities and can be transferred between brokers like ordinary shares. Unlisted managed funds typically cannot be transferred directly — you redeem units with the current platform and repurchase with the new one, which triggers a CGT event. Some platforms (like Vanguard Personal Investor and InvestSMART) hold managed funds outside the ASX CHESS system.",
  },
]);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TRANSFER_FROM_FAQ) }}
      />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
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
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold text-slate-700">From</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden md:table-cell">CHESS transfer fee</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden md:table-cell">In-specie</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 hidden lg:table-cell">Timeline</th>
                      <th className="px-4 py-3"></th>
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
    </>
  );
}
