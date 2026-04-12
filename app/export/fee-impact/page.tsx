import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

export const metadata = { title: "Fee Impact Report", robots: "noindex" };

export default async function FeeImpactExportPage({
  searchParams,
}: {
  searchParams: Promise<{ asx?: string; us?: string; size?: string; broker?: string }>;
}) {
  const params = await searchParams;
  const asxTrades = parseInt(params.asx || "4");
  const usTrades = parseInt(params.us || "2");
  const portfolioSize = parseInt(params.size || "10000");
  const highlightSlug = params.broker || "";

  const supabase = await createClient();
  const { data } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .eq("is_crypto", false)
    .order("name");

  const brokers = (data as Broker[]) || [];
  const now = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const results = brokers.map((b) => {
    const asxAnnual = (b.asx_fee_value ?? 0) * asxTrades * 12;
    const usAnnual = (b.us_fee_value != null && b.us_fee_value < 900 ? b.us_fee_value : 0) * usTrades * 12;
    const fxCost = usTrades > 0 ? portfolioSize * (b.fx_rate ?? 0) / 100 : 0;
    const total = asxAnnual + usAnnual + fxCost;
    return { broker: b, asxAnnual, usAnnual, fxCost, total };
  }).sort((a, b) => a.total - b.total);

  return (
    <div className="max-w-[800px] mx-auto px-6 py-10 font-sans text-slate-900">
      <div className="border-b-[3px] border-green-700 pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold m-0">Personal Fee Impact Report</h1>
            <p className="text-xs text-slate-500 mt-1 mb-0">Generated {now} by invest.com.au</p>
          </div>
          <div className="text-sm font-bold text-green-700">invest.com.au</div>
        </div>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "ASX Trades/Month", value: asxTrades.toString() },
          { label: "US Trades/Month", value: usTrades.toString() },
          { label: "Portfolio Size", value: `$${portfolioSize.toLocaleString()}` },
        ].map((p) => (
          <div key={p.label} className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500 mt-0 mb-1">{p.label}</p>
            <p className="text-lg font-bold m-0">{p.value}</p>
          </div>
        ))}
      </div>

      {/* Results Table */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 border-b-2 border-slate-200">
            <th className="text-left px-2.5 py-2 font-semibold text-slate-600">#</th>
            <th className="text-left px-2.5 py-2 font-semibold text-slate-600">Broker</th>
            <th className="text-right px-2.5 py-2 font-semibold text-slate-600">ASX/yr</th>
            <th className="text-right px-2.5 py-2 font-semibold text-slate-600">US/yr</th>
            <th className="text-right px-2.5 py-2 font-semibold text-slate-600">FX Cost</th>
            <th className="text-right px-2.5 py-2 font-bold text-slate-600">Total/yr</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const rowBg = r.broker.slug === highlightSlug ? "bg-green-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50";
            return (
              <tr
                key={r.broker.slug}
                className={`border-b border-slate-200 ${rowBg}`}
              >
                <td className="px-2.5 py-1.5 text-slate-400">{i + 1}</td>
                <td className={`px-2.5 py-1.5 ${i === 0 ? "font-bold" : "font-medium"}`}>
                  {r.broker.name} {i === 0 && "⭐"}
                </td>
                <td className="text-right px-2.5 py-1.5">${r.asxAnnual.toFixed(0)}</td>
                <td className="text-right px-2.5 py-1.5">${r.usAnnual.toFixed(0)}</td>
                <td className="text-right px-2.5 py-1.5">${r.fxCost.toFixed(0)}</td>
                <td className="text-right px-2.5 py-1.5 font-bold">${r.total.toFixed(0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Savings highlight */}
      {results.length >= 2 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs">
          <strong>Potential savings:</strong> Switching from the most expensive to the cheapest broker could save you{" "}
          <strong>${(results[results.length - 1].total - results[0].total).toFixed(0)}/year</strong>.
        </div>
      )}

      <div className="mt-8 p-3 bg-slate-50 rounded-lg text-[10px] text-slate-500 leading-relaxed">
        <strong>Disclaimer:</strong> {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}
      </div>

      <script dangerouslySetInnerHTML={{ __html: `if(typeof window!=='undefined'){window.onload=function(){window.print()}}` }} />
    </div>
  );
}
