import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

export const metadata = { title: "Broker Comparison Report", robots: "noindex" };

export default async function ComparisonExportPage({
  searchParams,
}: {
  searchParams: Promise<{ brokers?: string }>;
}) {
  const params = await searchParams;
  const slugs = (params.brokers || "").split(",").filter(Boolean);

  if (slugs.length === 0) {
    return <div className="p-8 text-center text-slate-500">No brokers selected. Add ?brokers=slug1,slug2 to URL.</div>;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("brokers")
    .select("*")
    .in("slug", slugs)
    .eq("status", "active");

  const brokers = (data as Broker[]) || [];
  const now = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <div style={{ borderBottom: "3px solid #15803d", paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Broker Comparison Report</h1>
            <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>Generated {now} by invest.com.au</p>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>invest.com.au</div>
        </div>
      </div>

      {/* Comparison Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
            <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600, color: "#475569" }}>Feature</th>
            {brokers.map((b) => (
              <th key={b.slug} style={{ textAlign: "center", padding: "10px 12px", fontWeight: 700, color: b.color }}>{b.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: "ASX Fee", fn: (b: Broker) => b.asx_fee || "N/A" },
            { label: "US Fee", fn: (b: Broker) => b.us_fee || "N/A" },
            { label: "FX Rate", fn: (b: Broker) => b.fx_rate != null ? `${b.fx_rate}%` : "N/A" },
            { label: "CHESS Sponsored", fn: (b: Broker) => b.chess_sponsored ? "Yes" : "No" },
            { label: "SMSF Support", fn: (b: Broker) => b.smsf_support ? "Yes" : "No" },
            { label: "Rating", fn: (b: Broker) => b.rating ? `${b.rating}/5` : "N/A" },
            { label: "Min Deposit", fn: (b: Broker) => b.min_deposit || "N/A" },
            { label: "Inactivity Fee", fn: (b: Broker) => b.inactivity_fee || "None" },
          ].map((row, i) => (
            <tr key={row.label} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
              <td style={{ padding: "8px 12px", fontWeight: 500 }}>{row.label}</td>
              {brokers.map((b) => (
                <td key={b.slug} style={{ textAlign: "center", padding: "8px 12px" }}>{row.fn(b)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pros/Cons */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Key Strengths & Weaknesses</h2>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(brokers.length, 3)}, 1fr)`, gap: 16 }}>
          {brokers.map((b) => (
            <div key={b.slug} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, borderTop: `3px solid ${b.color}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{b.name}</h3>
              {b.pros && b.pros.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#16a34a", marginBottom: 4 }}>PROS</p>
                  {b.pros.slice(0, 3).map((p, i) => (
                    <p key={i} style={{ fontSize: 11, color: "#334155", margin: "2px 0" }}>+ {p}</p>
                  ))}
                </div>
              )}
              {b.cons && b.cons.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>CONS</p>
                  {b.cons.slice(0, 3).map((c, i) => (
                    <p key={i} style={{ fontSize: 11, color: "#334155", margin: "2px 0" }}>- {c}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: 32, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>
        <strong>Disclaimer:</strong> {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}
        <br /><br />
        Report generated by invest.com.au. Data sourced from official broker fee schedules and verified by our editorial team.
        Fees are subject to change. Always verify current fees on the broker&apos;s website before opening an account.
      </div>

      {/* Auto-print script */}
      <script dangerouslySetInnerHTML={{ __html: `if(typeof window!=='undefined'){window.onload=function(){window.print()}}` }} />
    </div>
  );
}
