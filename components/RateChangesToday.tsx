import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface ChangeRow {
  broker_slug: string;
  broker_name: string;
  product_kind: string;
  old_rate_bps: number | null;
  new_rate_bps: number;
  delta_bps: number;
  direction: "up" | "down" | "new";
  logged_at: string;
}

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

const PRODUCT_LABELS: Record<string, string> = {
  savings_account: "Savings",
  term_deposit: "Term Deposit",
};

export default async function RateChangesToday() {
  let changes: ChangeRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rate_change_log")
      .select("broker_slug, broker_name, product_kind, old_rate_bps, new_rate_bps, delta_bps, direction, logged_at")
      .order("logged_at", { ascending: false })
      .limit(8);
    changes = (data ?? []) as ChangeRow[];
  } catch {
    // Secondary widget — fail silently
  }

  if (changes.length === 0) return null;

  const dayLabel = new Date(changes[0]?.logged_at ?? "").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="container-custom max-w-4xl my-6">
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-400)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rate changes</span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)", margin: "2px 0 0" }}>What changed {dayLabel}</h2>
          </div>
          <Link href="/rates/today" style={{ fontSize: 12, fontWeight: 600, color: "var(--color-blue-700)", textDecoration: "none" }}>
            View all →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          {changes.map((c, i) => {
            const isUp = c.direction === "up";
            const isNew = c.direction === "new";
            const accentColor = isUp ? "#16a34a" : isNew ? "#1d4ed8" : "#dc2626";
            const accentBg = isUp ? "#f0fdf4" : isNew ? "#eff6ff" : "#fef2f2";
            const arrow = isUp ? "↑" : isNew ? "★" : "↓";
            const productLabel = PRODUCT_LABELS[c.product_kind] ?? c.product_kind;
            const brokerPath = c.product_kind === "savings_account" || c.product_kind === "term_deposit"
              ? `/savings/${c.broker_slug}`
              : `/broker/${c.broker_slug}`;

            return (
              <Link
                key={`${c.broker_slug}-${c.product_kind}-${i}`}
                href={brokerPath}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderRight: i % 4 !== 3 ? "1px solid #f1f5f9" : "none",
                  borderBottom: Math.floor(i / 4) < Math.floor((changes.length - 1) / 4) ? "1px solid #f1f5f9" : "none",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 16, color: accentColor, background: accentBg, width: 28, height: 28, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700 }}>
                  {arrow}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink-800)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.broker_name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-ink-400)", marginTop: 1 }}>
                    {productLabel} · <span style={{ color: accentColor, fontWeight: 600 }}>{isNew ? bpsToPercent(c.new_rate_bps) : (isUp ? "+" : "") + bpsToPercent(c.delta_bps)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
