"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { trackEvent } from "@/lib/tracking";

interface StackComponent {
  kind: "share_broker" | "super_fund" | "savings_account" | "crypto_exchange" | "robo_advisor";
  slug: string;
  broker: {
    slug: string;
    name: string;
    affiliate_url?: string | null;
    benefit_cta?: string | null;
    rating?: number | null;
    fee_description?: string | null;
  };
  score: number;
  fitness: number;
}

interface WealthStack {
  components: StackComponent[];
  stackId: string;
}

const KIND_LABELS: Record<StackComponent["kind"], string> = {
  share_broker: "Share broker",
  super_fund: "Super fund",
  savings_account: "Savings account",
  crypto_exchange: "Crypto exchange",
  robo_advisor: "Robo advisor",
};

const KIND_DESCRIPTIONS: Record<StackComponent["kind"], string> = {
  share_broker: "Buy and hold ASX + global shares + ETFs.",
  super_fund: "Where your retirement contributions sit.",
  savings_account: "High-interest cash for goals < 2 years away.",
  crypto_exchange: "AUSTRAC-registered exchange with AUD deposits.",
  robo_advisor: "Hands-off diversified portfolio with auto-rebalancing.",
};

const GOALS: Array<{ value: string; label: string; emoji: string }> = [
  { value: "grow", label: "Build long-term wealth", emoji: "🌱" },
  { value: "income", label: "Generate income / dividends", emoji: "💵" },
  { value: "trade", label: "Active trading", emoji: "📈" },
  { value: "property", label: "Save for a property deposit", emoji: "🏠" },
  { value: "super", label: "Optimise super only", emoji: "🏛️" },
  { value: "crypto", label: "Explore crypto", emoji: "🪙" },
  { value: "automate", label: "Hands-off / automated", emoji: "🤖" },
];

const AMOUNTS: Array<{ value: "small" | "medium" | "large" | "xlarge" | "whale"; label: string }> = [
  { value: "small", label: "Under $5k" },
  { value: "medium", label: "$5k–$25k" },
  { value: "large", label: "$25k–$100k" },
  { value: "xlarge", label: "$100k+" },
];

function fitnessLabel(fitness: number): string {
  if (fitness >= 0.95) return "Core";
  if (fitness >= 0.65) return "Strong fit";
  if (fitness >= 0.4) return "Nice to have";
  return "Optional";
}

function fitnessColor(fitness: number): string {
  if (fitness >= 0.95) return "bg-violet-50 text-violet-800 border-violet-200";
  if (fitness >= 0.65) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (fitness >= 0.4) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function WealthStackClient() {
  const [goal, setGoal] = useState<string>("");
  const [amount, setAmount] = useState<typeof AMOUNTS[number]["value"] | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [stack, setStack] = useState<WealthStack | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optional pre-fill from a prior /quiz session — keeps the experience
  // continuous for users who arrive via the existing quiz funnel.
  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    try {
      const raw = sessionStorage.getItem("quiz-state-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { goal?: string; amount?: typeof AMOUNTS[number]["value"] };
      if (parsed.goal && !goal) setGoal(parsed.goal);
      if (parsed.amount && !amount) setAmount(parsed.amount);
    } catch {
      // ignore — best-effort pre-fill
    }
    // Run once on mount; intentional empty deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!goal) {
      setError("Pick a goal so we know what to recommend.");
      return;
    }
    if (!amount) {
      setError("Pick a starting amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/wealth-stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: [goal, amount],
          goal,
          amount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStack(data.stack as WealthStack);
      trackEvent("wealth_stack_built", { goal, amount, stackId: data.stack?.stackId, components: (data.stack?.components ?? []).length }, "/wealth-stack");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (stack) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Your stack</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {stack.components.length}-piece wealth stack
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Built from your answers. Tagged Core / Strong fit / Nice to have so you can prioritise.
            We get a small commission from some of these if you sign up — never enough to bend the ranking.
          </p>
        </header>

        <section aria-label="Stack components" className="space-y-3">
          {stack.components.map((c) => {
            const ctaUrl = c.broker.affiliate_url
              ? `${c.broker.affiliate_url}${c.broker.affiliate_url.includes("?") ? "&" : "?"}stack_id=${encodeURIComponent(stack.stackId)}&stack_kind=${c.kind}`
              : null;
            return (
              <article
                key={`${c.kind}-${c.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                      {KIND_LABELS[c.kind]}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-slate-900">{c.broker.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{KIND_DESCRIPTIONS[c.kind]}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${fitnessColor(c.fitness)}`}
                  >
                    {fitnessLabel(c.fitness)}
                  </span>
                </div>
                {c.broker.fee_description && (
                  <p className="mt-3 text-xs text-slate-600">{c.broker.fee_description}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <Link
                    href={`/broker/${c.broker.slug}`}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Read review
                  </Link>
                  {ctaUrl && (
                    <a
                      href={ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      onClick={() => trackEvent("wealth_stack_cta_click", { kind: c.kind, slug: c.slug, stackId: stack.stackId }, "/wealth-stack")}
                      className="ml-auto inline-flex items-center rounded-md bg-violet-600 px-3 py-1.5 font-semibold text-white hover:bg-violet-700"
                    >
                      {c.broker.benefit_cta || "Visit site"} &rarr;
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <button
          type="button"
          onClick={() => setStack(null)}
          className="text-xs text-slate-500 underline hover:text-slate-700"
        >
          Start over with different answers
        </button>

        <p className="text-[0.65rem] text-slate-400">
          General information only — not personal advice. Always read the relevant PDS / Target
          Market Determination before opening an account. Stack ID: <code>{stack.stackId}</code>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
          60-second wealth stack
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Tell us two things — get a 3–5 product stack matched to you
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Most comparison tools recommend one broker. The reality is most investors need a stack:
          a broker, a super fund, a high-interest savings account, maybe a crypto exchange.
          We&apos;ll match all of it from two questions.
        </p>
      </header>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-900">
          1. What&apos;s your main goal right now?
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {GOALS.map((g) => (
            <label
              key={g.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                goal === g.value
                  ? "border-violet-500 bg-violet-50 text-violet-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="goal"
                value={g.value}
                checked={goal === g.value}
                onChange={() => setGoal(g.value)}
                className="sr-only"
              />
              <span className="text-lg" aria-hidden>
                {g.emoji}
              </span>
              <span>{g.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-900">
          2. How much are you starting with?
        </legend>
        <div className="grid gap-2 sm:grid-cols-4">
          {AMOUNTS.map((a) => (
            <label
              key={a.value}
              className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm ${
                amount === a.value
                  ? "border-violet-500 bg-violet-50 text-violet-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="amount"
                value={a.value}
                checked={amount === a.value}
                onChange={() => setAmount(a.value)}
                className="sr-only"
              />
              {a.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-300"
      >
        {submitting ? "Building your stack…" : "Build my stack"}
      </button>
    </form>
  );
}
