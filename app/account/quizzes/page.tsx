import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listForUser } from "@/lib/quiz-history";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Quiz History — My Account",
  robots: "noindex, nofollow",
};

/**
 * /account/quizzes — full personal quiz history.
 *
 * Each row shows when the user took the quiz, which vertical
 * was inferred, and which broker/advisor came out on top. Users
 * can click through to the recommendation page or re-take the
 * quiz from the top match.
 */
export default async function AccountQuizHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login?redirect=/account/quizzes");
  }

  const rows = await listForUser(user.id);

  return (
    <div className="py-6 md:py-10">
      <div className="container-custom max-w-3xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/account" className="hover:text-slate-900">
            ← My account
          </Link>
        </nav>
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-slate-900">
            My Quiz History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Every time you take the Invest.com.au quiz, we save your answers
            so you can compare how your profile has changed.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm text-slate-600">
              You haven&rsquo;t taken the quiz yet.
            </p>
            <Link
              href="/quiz"
              className="mt-4 inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Take the quiz →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {rows.map((r) => {
              const when = new Date(r.created_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <li key={r.id} className="p-4">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {r.inferred_vertical
                          ? `${r.inferred_vertical} pathway`
                          : "Quiz run"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{when}</p>
                    </div>
                    {r.top_match_slug ? (
                      <Link
                        href={`/broker/${r.top_match_slug}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View top match →
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/quiz"
            className="text-xs font-medium text-primary hover:underline"
          >
            Take the quiz again →
          </Link>
        </div>
      </div>
    </div>
  );
}
