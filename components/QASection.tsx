import Link from "next/link";

interface QAPair {
  id: number;
  question: string;
  display_name: string;
  created_at: string;
  answers: {
    id: number;
    answer: string;
    answered_by: string;
    author_slug?: string;
    display_name?: string;
    is_accepted: boolean;
    created_at: string;
  }[];
}

interface QASectionProps {
  questions: QAPair[];
  brokerSlug: string;
  brokerName: string;
  pageType?: string;
  pageSlug?: string;
}

export default function QASection({ questions, brokerSlug, brokerName, pageType = "broker", pageSlug }: QASectionProps) {
  if (questions.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">
        Questions About {brokerName}
      </h2>
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">Q</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{q.question}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Asked by {q.display_name} · {new Date(q.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
            {q.answers.length > 0 && (
              <div className="mt-3 ml-9 space-y-3">
                {q.answers.map((a) => (
                  <div key={a.id} className="border-l-2 border-slate-200 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                        {a.answered_by === "editorial" ? "Editorial" : "Community"}
                      </span>
                      {a.is_accepted && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                          Accepted
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{a.answer}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {a.author_slug ? (
                        <Link href={`/authors/${a.author_slug}`} className="hover:text-slate-600 underline">
                          {a.display_name || "Editorial Team"}
                        </Link>
                      ) : (
                        a.display_name || "Editorial Team"
                      )}
                      {" · "}
                      {new Date(a.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
