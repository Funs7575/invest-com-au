/**
 * GET /api/account/wrapped-card — the user's personal FY Wrapped PNG.
 *
 * Privacy model: this is the ONLY surface that renders personal Wrapped
 * numbers as an image, and it is strictly session-authenticated — no
 * tokens, nothing guessable in a URL, `Cache-Control: private, no-store`
 * so no CDN or shared cache ever holds a copy. The public /wrapped OG
 * image stays generic; sharing your numbers means downloading this card
 * yourself and posting it deliberately.
 *
 * Auth: Supabase session required. 401 otherwise.
 * Rate limit: 20 / min / IP (image render is the most expensive thing here).
 */
import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";

import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { formatAudCents, wrappedFyForDate, type WrappedData } from "@/lib/wrapped";
import { loadWrappedData } from "@/lib/wrapped-server";

export const runtime = "nodejs";

interface StatRow {
  label: string;
  value: string;
}

function statRows(data: WrappedData): StatRow[] {
  const rows: StatRow[] = [];
  if (data.balances) rows.push({ label: "Tracking", value: formatAudCents(data.balances.totalCents) });
  if (data.invested) {
    rows.push({ label: "Put to work", value: `+${formatAudCents(data.invested.addedCents)}` });
  }
  if (data.goals) {
    rows.push({ label: "Goals", value: `${data.goals.onTrack} of ${data.goals.total} on track` });
  }
  if (data.health) {
    rows.push({
      label: "Health score",
      value:
        data.health.months >= 2 && data.health.startGrade !== data.health.endGrade
          ? `${data.health.startGrade} → ${data.health.endGrade}`
          : `Grade ${data.health.endGrade}`,
    });
  }
  if (data.streak && data.streak.longestRunDays >= 2) {
    rows.push({ label: "Best streak", value: `${data.streak.longestRunDays} days` });
  }
  if (data.alerts && (data.alerts.alertsTriggered ?? 0) > 0) {
    rows.push({ label: "Rate alerts fired", value: `${data.alerts.alertsTriggered}` });
  }
  if (data.activity) rows.push({ label: "Research moves", value: `${data.activity.total}` });
  return rows.slice(0, 4);
}

export async function GET(request: NextRequest) {
  if (!(await isAllowed("account_wrapped_card", ipKey(request), { max: 20, refillPerSec: 0.34 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const fy = wrappedFyForDate(now);
  const data = await loadWrappedData(
    supabase,
    { id: user.id, createdAt: user.created_at ?? null },
    fy,
    now.getTime(),
  );
  const rows = statRows(data);

  const bg = "#1e1b4b";
  const violet = "#8b5cf6";
  const amber = "#f59e0b";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px",
          backgroundColor: bg,
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "10px",
            background: `linear-gradient(to right, ${violet}, ${amber})`,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: "26px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "8px",
            color: amber,
          }}
        >
          {fy.label} · My year in money
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "84px",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            marginTop: "18px",
          }}
        >
          Money Wrapped
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            marginTop: "64px",
            flexGrow: 1,
          }}
        >
          {rows.length > 0 ? (
            rows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(139, 92, 246, 0.16)",
                  border: "1px solid rgba(196, 181, 253, 0.3)",
                  borderRadius: "22px",
                  padding: "26px 36px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: "26px",
                    fontWeight: 700,
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    color: "#c4b5fd",
                  }}
                >
                  {row.label}
                </div>
                <div style={{ display: "flex", fontSize: "44px", fontWeight: 800 }}>
                  {row.value}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                display: "flex",
                fontSize: "40px",
                fontWeight: 700,
                color: "#c4b5fd",
                lineHeight: 1.3,
                maxWidth: "85%",
              }}
            >
              My first FY starts now — a clean slate.
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "24px",
            fontWeight: 600,
            opacity: 0.75,
          }}
        >
          <span>invest.com.au/wrapped</span>
          <span style={{ color: amber }}>My own saved data · general info only</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      headers: {
        // Personal data: never cacheable beyond the owner's browser.
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${fy.label.toLowerCase()}-money-wrapped.png"`,
      },
    },
  );
}
