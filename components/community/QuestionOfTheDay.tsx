import Link from "next/link";
import Icon from "@/components/Icon";
import { getQuestionOfTheDay, QOTD_AUTHOR_NAME } from "@/lib/community/qotd";

/**
 * "Question of the day" card for the community hub (plan Phase 1.4).
 *
 * FLAG-GATED OFF: `getQuestionOfTheDay()` returns null unless the
 * `community_qotd` feature flag is enabled (it has no row, so it is off
 * everywhere — see lib/community/qotd.ts). With the flag off, or with no
 * fresh prompt, this component renders nothing at all: no container, no
 * layout shift.
 */
export default async function QuestionOfTheDay() {
  const qotd = await getQuestionOfTheDay();
  if (!qotd) return null;

  const href = `/community/${qotd.category_slug}/${qotd.id}`;
  const excerpt =
    qotd.body.length > 180 ? `${qotd.body.slice(0, 180).trimEnd()}…` : qotd.body;

  return (
    <div className="container-custom max-w-4xl mt-5">
      <section
        aria-label="Question of the day"
        className="bg-emerald-50 border border-emerald-200 rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon name="help-circle" size={16} className="text-emerald-700" />
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
            Question of the day
          </p>
        </div>
        <Link href={href} className="group block">
          <h2 className="text-base md:text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors mb-1">
            {qotd.title}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">{excerpt}</p>
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Join the discussion
            <Icon name="chevron-right" size={14} />
          </Link>
          <p className="text-xs text-slate-500">
            Posted by {QOTD_AUTHOR_NAME} &middot;{" "}
            {qotd.reply_count === 1 ? "1 reply" : `${qotd.reply_count} replies`}
          </p>
        </div>
        <p className="text-[0.69rem] text-slate-400 mt-3">
          General discussion only — answers are general information, not
          personal financial advice.
        </p>
      </section>
    </div>
  );
}
