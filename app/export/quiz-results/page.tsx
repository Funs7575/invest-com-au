import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

export const metadata = { title: "Your Broker Quiz Results", robots: "noindex" };

export default async function QuizResultsExportPage({
  searchParams,
}: {
  searchParams: Promise<{ answers?: string; top?: string }>;
}) {
  const params = await searchParams;
  const answers = (params.answers || "").split(",").filter(Boolean);
  const topSlugs = (params.top || "").split(",").filter(Boolean);

  if (topSlugs.length === 0) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No results to display.</div>;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("brokers")
    .select("*")
    .in("slug", topSlugs)
    .eq("status", "active");

  // Preserve order
  const brokerMap = new Map((data as Broker[] || []).map((b) => [b.slug, b]));
  const brokers = topSlugs.map((s) => brokerMap.get(s)).filter(Boolean) as Broker[];
  const now = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const answerLabels: Record<string, string> = {
    crypto: "Buy Crypto", trade: "Active Trading", income: "Dividend Income", grow: "Long-Term Growth",
    beginner: "Complete Beginner", intermediate: "Some Experience", pro: "Advanced",
    small: "Under $5,000", medium: "$5k - $50k", large: "$50k - $100k", whale: "$100k+",
    fees: "Lowest Fees", safety: "Safety (CHESS)", tools: "Best Tools", simple: "Simplicity",
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
      <div style={{ borderBottom: "3px solid #15803d", paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Your Broker Quiz Results</h1>
        <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>Generated {now} by invest.com.au</p>
      </div>

      {/* Your Answers */}
      {answers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Your Answers</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {answers.map((a, i) => (
              <span key={i} style={{ fontSize: 11, background: "#f1f5f9", padding: "4px 10px", borderRadius: 12, color: "#475569" }}>
                {answerLabels[a] || a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {brokers.map((b, i) => (
        <div
          key={b.slug}
          style={{
            border: i === 0 ? `2px solid ${b.color}` : "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderLeft: `4px solid ${b.color}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? b.color : "#64748b" }}>
                #{i + 1} {i === 0 ? "TOP MATCH" : "ALSO RECOMMENDED"}
              </span>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "4px 0 0" }}>{b.name}</h3>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{b.rating}/5</div>
          </div>
          <p style={{ fontSize: 12, color: "#475569", margin: "0 0 8px" }}>{b.tagline}</p>
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#64748b" }}>
            <span>ASX: {b.asx_fee || "N/A"}</span>
            <span>CHESS: {b.chess_sponsored ? "Yes" : "No"}</span>
            <span>SMSF: {b.smsf_support ? "Yes" : "No"}</span>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 24, padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 12 }}>
        <strong>Next steps:</strong> Open an account with your top match, or compare all brokers at invest.com.au/compare
      </div>

      <div style={{ marginTop: 24, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>
        <strong>Disclaimer:</strong> {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}
      </div>

      <script dangerouslySetInnerHTML={{ __html: `if(typeof window!=='undefined'){window.onload=function(){window.print()}}` }} />
    </div>
  );
}
