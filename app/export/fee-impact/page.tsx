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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
      <div style={{ borderBottom: "3px solid #15803d", paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Personal Fee Impact Report</h1>
            <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>Generated {now} by invest.com.au</p>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>invest.com.au</div>
        </div>
      </div>

      {/* Parameters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "ASX Trades/Month", value: asxTrades.toString() },
          { label: "US Trades/Month", value: usTrades.toString() },
          { label: "Portfolio Size", value: `$${portfolioSize.toLocaleString()}` },
        ].map((p) => (
          <div key={p.label} style={{ background: "#f8fafc", borderRadius: 8, padding: 12, textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 4px" }}>{p.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{p.value}</p>
          </div>
        ))}
      </div>

      {/* Results Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
            <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, color: "#475569" }}>#</th>
            <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, color: "#475569" }}>Broker</th>
            <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, color: "#475569" }}>ASX/yr</th>
            <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, color: "#475569" }}>US/yr</th>
            <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, color: "#475569" }}>FX Cost</th>
            <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 700, color: "#475569" }}>Total/yr</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr
              key={r.broker.slug}
              style={{
                borderBottom: "1px solid #e2e8f0",
                background: r.broker.slug === highlightSlug ? "#f0fdf4" : i % 2 === 0 ? "#fff" : "#f8fafc",
              }}
            >
              <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{i + 1}</td>
              <td style={{ padding: "6px 10px", fontWeight: i === 0 ? 700 : 500 }}>
                {r.broker.name} {i === 0 && "⭐"}
              </td>
              <td style={{ textAlign: "right", padding: "6px 10px" }}>${r.asxAnnual.toFixed(0)}</td>
              <td style={{ textAlign: "right", padding: "6px 10px" }}>${r.usAnnual.toFixed(0)}</td>
              <td style={{ textAlign: "right", padding: "6px 10px" }}>${r.fxCost.toFixed(0)}</td>
              <td style={{ textAlign: "right", padding: "6px 10px", fontWeight: 700 }}>${r.total.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Savings highlight */}
      {results.length >= 2 && (
        <div style={{ marginTop: 16, padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 12 }}>
          <strong>Potential savings:</strong> Switching from the most expensive to the cheapest broker could save you{" "}
          <strong>${(results[results.length - 1].total - results[0].total).toFixed(0)}/year</strong>.
        </div>
      )}

      <div style={{ marginTop: 32, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>
        <strong>Disclaimer:</strong> {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}
      </div>

      <script dangerouslySetInnerHTML={{ __html: `if(typeof window!=='undefined'){window.onload=function(){window.print()}}` }} />
    </div>
  );
}
