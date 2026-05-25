import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import {
  WEIGHT_VERIFICATION,
  WEIGHT_TRACK_RECORD,
  WEIGHT_TRANSPARENCY,
  WEIGHT_CLIENT_FEEDBACK,
} from "@/lib/advisor-trust-score";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Advisor Trust Score Methodology — How We Calculate It (${CURRENT_YEAR})`,
  description:
    "Full methodology for the Invest.com.au Advisor Trust Score: what data we use, " +
    "how each of the four dimensions is scored, and how the overall score is calculated. " +
    "Factual credential signals only — not a recommendation.",
  alternates: { canonical: "/advisor/trust-score-methodology" },
  openGraph: {
    title: "Advisor Trust Score Methodology",
    description:
      "How Invest.com.au computes the Advisor Trust Score from factual credential and " +
      "compliance signals. Four dimensions, named-constant weights, fully transparent.",
    url: "/advisor/trust-score-methodology",
  },
};

const DIMENSIONS = [
  {
    key: "verification",
    label: "Verification & Registration",
    weight: WEIGHT_VERIFICATION,
    color: "bg-blue-500",
    signals: [
      { signal: "Profile verified by Invest.com.au editorial team", pts: 50 },
      { signal: "AFSL number present on profile", pts: 30 },
      { signal: "Registration number present (AR, Credit Rep, MARN, etc.)", pts: 10 },
      { signal: "Verification is current (within the past 12 months)", pts: 10 },
    ],
    notes:
      "Verification is cross-checked against ASIC Professional Registers. " +
      "An AFSL number alone does not guarantee the licence is current — verification " +
      "additionally confirms the status is active at the time of review.",
  },
  {
    key: "track_record",
    label: "Track Record",
    weight: WEIGHT_TRACK_RECORD,
    color: "bg-violet-500",
    bands: [
      { years: "15+ years", score: 100 },
      { years: "10–14 years", score: 85 },
      { years: "7–9 years", score: 70 },
      { years: "5–6 years", score: 55 },
      { years: "3–4 years", score: 40 },
      { years: "1–2 years", score: 25 },
      { years: "< 1 year or no data", score: 10 },
    ],
    notes:
      "The higher of two signals is used: (a) self-reported years of professional experience, " +
      "or (b) time since the advisor joined the Invest.com.au platform. " +
      "This dimension reflects observable tenure only — it does not imply investment performance, " +
      "suitability, or quality of advice.",
  },
  {
    key: "transparency",
    label: "Profile Transparency",
    weight: WEIGHT_TRANSPARENCY,
    color: "bg-teal-500",
    signals: [
      { signal: "Biography (30+ characters)", pts: 20 },
      { signal: "Profile photo", pts: 15 },
      { signal: "Qualifications list", pts: 15 },
      { signal: "Fee structure or fee description", pts: 15 },
      { signal: "Education history", pts: 10 },
      { signal: "Professional memberships", pts: 10 },
      { signal: "Online presence (LinkedIn or website)", pts: 10 },
      { signal: "Multiple languages spoken", pts: 5 },
    ],
    notes:
      "Points are awarded for each field the advisor has populated. " +
      "Maximum 100 (all fields complete). This dimension measures disclosure, " +
      "not the content of the disclosure.",
  },
  {
    key: "client_feedback",
    label: "Client Feedback",
    weight: WEIGHT_CLIENT_FEEDBACK,
    color: "bg-amber-500",
    feedbackNote: true,
    notes:
      "The score is the average of two equal-weight sub-scores: " +
      "(1) Volume — how many approved reviews the advisor has collected; " +
      "(2) Quality — how the average star rating maps to a 0–100 scale. " +
      "For the quality sub-score the range [3.0 stars, 5.0 stars] is mapped " +
      "linearly to [0, 100]; a rating below 3.0 receives 0 quality points. " +
      "Reviews are moderated by the Invest.com.au team and are not editable by the advisor.",
  },
] as const;

const VOLUME_BANDS = [
  { reviews: "20+", score: 100 },
  { reviews: "10–19", score: 80 },
  { reviews: "5–9", score: 60 },
  { reviews: "2–4", score: 40 },
  { reviews: "1", score: 20 },
  { reviews: "0", score: 0 },
] as const;

export default function TrustScoreMethodologyPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "Trust Score Methodology" },
  ]);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* ── Hero ── */}
      <section className="bg-white border-b border-slate-100">
        <div className="container-custom py-6 md:py-8 max-w-4xl">
          {/* Breadcrumbs */}
          <nav
            className="text-xs text-slate-400 mb-4 flex items-center gap-1.5"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-600">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/advisors" className="hover:text-slate-600">
              Find an Advisor
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-600">Trust Score Methodology</span>
          </nav>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            Advisor Trust Score — Methodology
          </h1>
          <p className="text-slate-600 max-w-2xl leading-relaxed">
            The Trust Score is a{" "}
            <strong>factual composite of credential and compliance signals</strong>{" "}
            drawn from publicly available and platform-verifiable data. It is not a
            recommendation, personal advice, or a &ldquo;best advisor&rdquo; ranking. It is a
            transparency tool to help consumers understand an advisor&rsquo;s verifiable standing.
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <div className="container-custom py-8 max-w-4xl space-y-10">

        {/* Weight summary */}
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">
            Four Dimensions, Named-Constant Weights
          </h2>
          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
            The overall score (0–100) is a weighted average of four dimension scores.
            Weights are fixed constants in the source code and are published here for
            full transparency.
          </p>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                    Dimension
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                    Weight
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                    Max Contribution
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map((d, i) => (
                  <tr
                    key={d.key}
                    className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${d.color}`} />
                        <span className="font-medium text-slate-800">{d.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">
                      {(d.weight * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {(100 * d.weight).toFixed(0)} pts
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900">100%</td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900">100 pts</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Dimension detail */}
        {DIMENSIONS.map((d) => (
          <section key={d.key}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`inline-block w-3 h-3 rounded-full ${d.color}`} />
              <h2 className="text-lg font-extrabold text-slate-900">
                {d.label}{" "}
                <span className="text-sm font-normal text-slate-400">
                  ({(d.weight * 100).toFixed(0)}% weight)
                </span>
              </h2>
            </div>

            {"signals" in d && d.signals && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">
                        Signal
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.signals.map((s, i) => (
                      <tr
                        key={s.signal}
                        className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                      >
                        <td className="px-4 py-2.5 text-slate-700">{s.signal}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                          +{s.pts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {"bands" in d && d.bands && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">
                        Tenure / Experience
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600">
                        Dimension Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.bands.map((b, i) => (
                      <tr
                        key={b.years}
                        className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                      >
                        <td className="px-4 py-2.5 text-slate-700">{b.years}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                          {b.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {"feedbackNote" in d && d.feedbackNote && (
              <div className="grid sm:grid-cols-2 gap-4 mb-3">
                {/* Volume */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                    <p className="text-xs font-semibold text-slate-600">
                      Sub-score A — Volume (50% of dimension)
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {VOLUME_BANDS.map((vb, i) => (
                        <tr
                          key={vb.reviews}
                          className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                        >
                          <td className="px-4 py-2 text-slate-700">
                            {vb.reviews} reviews
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-800">
                            {vb.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Quality */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                    <p className="text-xs font-semibold text-slate-600">
                      Sub-score B — Quality (50% of dimension)
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-2 text-sm text-slate-600">
                    <p>
                      Linear mapping of the average star rating to 0–100:
                    </p>
                    <p className="font-mono text-xs bg-slate-50 rounded px-3 py-2 border border-slate-100">
                      quality = (rating − 3.0) ÷ 2.0 × 100
                    </p>
                    <ul className="text-xs space-y-1 text-slate-500">
                      <li>5.0 stars → 100 pts</li>
                      <li>4.0 stars → 50 pts</li>
                      <li>3.0 stars → 0 pts</li>
                      <li>&lt; 3.0 stars → 0 pts (floor)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
              {d.notes}
            </p>
          </section>
        ))}

        {/* Score bands */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3">
            Score Bands &amp; Labels
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">
                    Overall Score
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">
                    Label
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden sm:table-cell">
                    Interpretation
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { range: "80–100", label: "Strong", interp: "Verified, AFSL confirmed, high transparency, active client feedback." },
                  { range: "65–79", label: "Good", interp: "Most credential signals present; minor gaps in transparency or feedback." },
                  { range: "50–64", label: "Moderate", interp: "Some credential signals present; profile may be incomplete or newly joined." },
                  { range: "0–49", label: "Limited", interp: "Few verifiable credential signals on file at this time." },
                ].map((row, i) => (
                  <tr
                    key={row.range}
                    className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold tabular-nums text-slate-800">
                      {row.range}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">
                      {row.interp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* What the score is not */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3">
            What the Trust Score Is — and Is Not
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              <strong className="text-slate-800">What it IS:</strong> a factual composite
              score based on objectively checkable signals — whether an advisor is verified,
              whether they hold an AFSL, how long they have been on the platform, how much
              information they have disclosed on their profile, and what their independently
              moderated review record looks like.
            </p>
            <p>
              <strong className="text-slate-800">What it IS NOT:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-500">
              <li>
                Not a recommendation to use any particular advisor.
              </li>
              <li>
                Not a statement about investment performance, returns, or suitability for
                your specific circumstances.
              </li>
              <li>
                Not personal financial advice under the{" "}
                <em>Corporations Act 2001</em> (Cth).
              </li>
              <li>
                Not a ranking designed to steer consumers toward any advisor. Two advisors
                with the same score are equal — the score does not establish precedence
                within a band.
              </li>
              <li>
                Not a guarantee that the advisor&rsquo;s AFSL is currently active —
                licence status can change. Use the{" "}
                <a
                  href="https://connectonline.asic.gov.au/RegistrySearch/faces/landing/SearchRegisters.jspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-slate-800"
                >
                  ASIC Professional Registers
                </a>{" "}
                to verify current status.
              </li>
            </ul>
          </div>
        </section>

        {/* Data freshness */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-3">
            Data Freshness
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600 leading-relaxed">
            <p>
              The Trust Score is computed on-read directly from the advisor&rsquo;s live profile
              data each time the page is loaded (with ISR caching at 30-minute intervals).
              There is no separate scoring pipeline or database table — the score always
              reflects the current state of the profile.
            </p>
            <p className="mt-2">
              Advisors can improve their score by completing their profile, obtaining
              verification, and inviting clients to leave reviews through the advisor portal.
            </p>
          </div>
        </section>

        {/* General advice warning */}
        <section>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold mb-1">General Advice Warning</p>
            <p>{GENERAL_ADVICE_WARNING}</p>
          </div>
        </section>

        {/* Attribution */}
        <section className="text-xs text-slate-400 space-y-1">
          <p>
            Published by {SITE_NAME} &middot; Last updated {CURRENT_YEAR}.
          </p>
          <p>
            Questions about the methodology?{" "}
            <a
              href="mailto:corrections@invest.com.au"
              className="underline hover:text-slate-600"
            >
              corrections@invest.com.au
            </a>
          </p>
        </section>

        {/* Back link */}
        <div className="text-sm">
          <Link
            href="/advisors"
            className="text-slate-500 hover:text-slate-700 hover:underline"
          >
            &larr; Back to find an advisor
          </Link>
        </div>
      </div>
    </div>
  );
}
