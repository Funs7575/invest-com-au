import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

export const metadata = { title: "Your Platform Quiz Results", robots: "noindex" };

export default async function QuizResultsExportPage({
  searchParams,
}: {
  searchParams: Promise<{ answers?: string; top?: string }>;
}) {
  const params = await searchParams;
  const answers = (params.answers || "").split(",").filter(Boolean);
  const topSlugs = (params.top || "").split(",").filter(Boolean);

  if (topSlugs.length === 0) {
    return <div className="p-10 text-center text-slate-500">No results to display.</div>;
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
    <div className="max-w-[700px] mx-auto px-6 py-10 font-sans text-slate-900">
      <div className="border-b-[3px] border-green-700 pb-4 mb-6">
        <h1 className="text-2xl font-extrabold m-0">Your Platform Quiz Results</h1>
        <p className="text-xs text-slate-500 mt-1 mb-0">Generated {now} by invest.com.au</p>
      </div>

      {/* Your Answers */}
      {answers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-2">Your Answers</h2>
          <div className="flex gap-2 flex-wrap">
            {answers.map((a, i) => (
              <span key={i} className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-full text-slate-600">
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
          className="rounded-xl p-4 mb-3 border-l-4"
          style={{
            border: i === 0 ? `2px solid ${b.color}` : "1px solid #e2e8f0",
            borderLeftColor: b.color,
            borderLeftWidth: 4,
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <div>
              <span
                className="text-[10px] font-bold"
                style={{ color: i === 0 ? b.color : "#64748b" }}
              >
                #{i + 1} {i === 0 ? "TOP MATCH" : "ALSO RECOMMENDED"}
              </span>
              <h3 className="text-lg font-extrabold mt-1 mb-0">{b.name}</h3>
            </div>
            <div className="text-[13px] font-bold">{b.rating}/5</div>
          </div>
          <p className="text-xs text-slate-600 mt-0 mb-2">{b.tagline}</p>
          <div className="flex gap-4 text-[11px] text-slate-500">
            <span>ASX: {b.asx_fee || "N/A"}</span>
            <span>CHESS: {b.chess_sponsored ? "Yes" : "No"}</span>
            <span>SMSF: {b.smsf_support ? "Yes" : "No"}</span>
          </div>
        </div>
      ))}

      <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg text-xs">
        <strong>Next steps:</strong> Open an account with your top match, or compare all brokers at invest.com.au/compare
      </div>

      <div className="mt-6 p-3 bg-slate-50 rounded-lg text-[10px] text-slate-500 leading-relaxed">
        <strong>Disclaimer:</strong> {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}
      </div>

      <script dangerouslySetInnerHTML={{ __html: `if(typeof window!=='undefined'){window.onload=function(){window.print()}}` }} />
    </div>
  );
}
