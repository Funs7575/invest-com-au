import Link from "next/link";
import {
  allQuests,
  progressFor,
  QUEST_ICON_GLYPH,
  QUEST_TIER_LABEL,
  type Quest,
} from "@/lib/quests";
import {
  CONSUMER_QUESTS_FLAG,
  getUserAwards,
} from "@/lib/quests-server";
import { isFlagEnabled } from "@/lib/feature-flags";

/**
 * Dashboard badge shelf — Consumer Quests (idea #19).
 *
 * Self-contained SERVER component. The dashboard page renders it inside one
 * flag-gated block; this component additionally re-checks the flag itself so
 * it is safe to mount anywhere and is the single place that decides whether
 * the shelf appears at all.
 *
 * Rendering contract:
 *   - Flag OFF (fail-closed) or the `user_achievements` table absent in prod
 *     ⇒ renders NOTHING (`null`). `getUserAwards` already fails soft to `[]`,
 *     and the flag check short-circuits before any DB read.
 *   - Flag ON ⇒ renders earned badges (considered, restrained design — tools,
 *     not trophies; no gold stars, no performance framing) plus the locked
 *     next quests, each with a real in-app CTA so the shelf actively walks a
 *     new user through the setup actions that create saved state.
 *
 * Visual tone (§ serious): quests reward SETUP actions only. Copy is factual;
 * earned state is a quiet filled chip, not a celebration.
 */
export default async function QuestShelf({ userId }: { userId: string }) {
  // Fail-closed flag gate. Distinguishes "flag off → render nothing" from
  // "flag on, zero awards → render the locked/onboarding state", which the
  // `[]` return of getUserAwards alone cannot.
  const enabled = await isFlagEnabled(CONSUMER_QUESTS_FLAG, {
    userKey: userId,
    segment: "user",
  });
  if (!enabled) return null;

  const awards = await getUserAwards(userId);
  const earnedIds = awards.map((a) => a.quest_id);
  const progress = progressFor(earnedIds);
  const earnedSet = new Set(progress.earnedIds);

  const quests = allQuests();
  const earned = quests.filter((q) => earnedSet.has(q.id));
  // Up to three locked quests to suggest next, starting from the first
  // unearned one (presentation order ≈ activation journey).
  const locked = quests.filter((q) => !earnedSet.has(q.id)).slice(0, 3);
  const next = progress.nextSuggested;

  return (
    <section aria-labelledby="quests-heading" className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2
          id="quests-heading"
          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Setup milestones
        </h2>
        <span className="text-[11px] text-slate-400">
          {progress.totalEarned} of {progress.totalQuests} complete
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {/* Tier progress — a quiet readout, not a score. */}
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5">
          {progress.perTier.map((t) => (
            <div key={t.tier} className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {QUEST_TIER_LABEL[t.tier]}
              </span>
              <span className="text-[11px] font-medium text-slate-600">
                {t.earned}/{t.total}
              </span>
            </div>
          ))}
        </div>

        {/* Earned badges — filled, restrained chips. Hidden until there is at
            least one, so a brand-new account leads with the next action. */}
        {earned.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Earned
            </p>
            <ul className="flex flex-wrap gap-2">
              {earned.map((q) => (
                <EarnedBadge key={q.id} quest={q} />
              ))}
            </ul>
          </div>
        )}

        {/* Next suggested quest — the single highlighted call to action. */}
        {next && <NextQuestCard quest={next} />}

        {/* Remaining locked quests as quiet, linkable rows. */}
        {locked.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100">
            {locked
              .filter((q) => !next || q.id !== next.id)
              .map((q) => (
                <LockedQuestRow key={q.id} quest={q} />
              ))}
          </ul>
        )}

        {/* Everything earned. */}
        {!next && earned.length === quests.length && (
          <p className="text-xs text-slate-500">
            Every setup milestone complete — your account data is working as
            hard as it can for you.
          </p>
        )}
      </div>
    </section>
  );
}

function EarnedBadge({ quest }: { quest: Quest }) {
  return (
    <li>
      <Link
        href={quest.ctaHref}
        title={quest.description}
        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-100"
      >
        <span aria-hidden className="text-sm leading-none">
          {QUEST_ICON_GLYPH[quest.icon]}
        </span>
        <span>{quest.title}</span>
      </Link>
    </li>
  );
}

function NextQuestCard({ quest }: { quest: Quest }) {
  return (
    <Link
      href={quest.ctaHref}
      className="group flex items-start gap-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 p-4 transition-all hover:border-violet-300 hover:shadow-sm"
    >
      <span
        aria-hidden
        className="mt-0.5 shrink-0 text-xl leading-none opacity-80"
      >
        {QUEST_ICON_GLYPH[quest.icon]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">
          Do this next
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900 transition-colors group-hover:text-violet-700">
          {quest.title}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{quest.description}</p>
      </div>
      <span className="mt-0.5 shrink-0 self-center rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-violet-700">
        {quest.ctaLabel}
      </span>
    </Link>
  );
}

function LockedQuestRow({ quest }: { quest: Quest }) {
  return (
    <li>
      <Link
        href={quest.ctaHref}
        className="group flex items-center justify-between gap-3 py-2.5"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="shrink-0 text-base leading-none opacity-40 grayscale"
          >
            {QUEST_ICON_GLYPH[quest.icon]}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-slate-700 transition-colors group-hover:text-violet-700">
              {quest.title}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-violet-600 group-hover:underline">
          {quest.ctaLabel}
        </span>
      </Link>
    </li>
  );
}
