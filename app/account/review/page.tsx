import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFlagEnabled } from "@/lib/feature-flags";
import { loadReviewModel, loadReviewHistory } from "@/lib/monthly-review-data";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ReviewFlowClient from "./ReviewFlowClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Monthly Money Review — My Account",
  robots: "noindex, nofollow",
};

export default async function MonthlyReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/account/review");

  // Fail-closed flag gate at the server-component level. When off, the page
  // renders a clean "not available yet" notice and no review machinery loads.
  const enabled = await isFlagEnabled("monthly_review", {
    userKey: user.email ?? user.id,
    segment: "user",
  });

  if (!enabled) {
    return <NotAvailableYet />;
  }

  const [model, history] = await Promise.all([
    loadReviewModel(supabase, user.id),
    loadReviewHistory(supabase, user.id),
  ]);

  return (
    <div
      style={{
        background: "var(--color-ink-50)",
        minHeight: "100vh",
        paddingTop: 32,
        paddingBottom: 72,
      }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 20 }}
        >
          <Link
            href="/account"
            style={{ color: "var(--color-ink-400)", textDecoration: "none" }}
          >
            My Account
          </Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <span style={{ color: "var(--color-ink-600)" }}>Monthly review</span>
        </nav>

        <ReviewFlowClient model={model} history={history} />

        {/* Compliance footer */}
        <p
          style={{
            fontSize: 11,
            color: "var(--color-ink-400)",
            lineHeight: 1.6,
            marginTop: 32,
          }}
        >
          {GENERAL_ADVICE_WARNING} Every figure here is arithmetic on your own
          stored data — not financial advice.
        </p>
      </div>
    </div>
  );
}

function NotAvailableYet() {
  return (
    <div
      style={{
        background: "var(--color-ink-50)",
        minHeight: "100vh",
        paddingTop: 32,
        paddingBottom: 72,
      }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <nav
          aria-label="Breadcrumb"
          style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 20 }}
        >
          <Link
            href="/account"
            style={{ color: "var(--color-ink-400)", textDecoration: "none" }}
          >
            My Account
          </Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <span style={{ color: "var(--color-ink-600)" }}>Monthly review</span>
        </nav>

        <div
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 16 }} aria-hidden="true">
            🗓️
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 8,
            }}
          >
            Monthly Money Review is coming soon
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#64748b",
              maxWidth: 380,
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            A guided 10-minute check-in on your net worth, goals, rates and open
            decisions — with a completion streak. It&apos;s not switched on for
            your account just yet.
          </p>
          <Link
            href="/account/dashboard"
            style={{
              display: "inline-block",
              padding: "10px 22px",
              background: "#0f172a",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 9,
              textDecoration: "none",
            }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
