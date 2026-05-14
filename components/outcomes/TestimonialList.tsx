import Icon from "@/components/Icon";
import type { PublicTestimonial } from "@/lib/outcomes/profile-display";

/**
 * Public testimonials section — shown on provider profile pages.
 * Sourced from N4 outcome-flywheel submissions where the consumer
 * opted-in (`show_testimonial = true`) and provided free-text feedback.
 *
 * Consumer name + email are never exposed (the column doesn't surface
 * them); testimonials are anonymous-by-default by design.
 */

interface Props {
  testimonials: PublicTestimonial[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { year: "numeric", month: "short" });
}

export default function TestimonialList({ testimonials }: Props) {
  if (testimonials.length === 0) return null;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="message-circle" size={16} className="text-amber-500" />
        <h2 className="text-base font-bold text-slate-900">
          What clients say
        </h2>
        <span className="text-xs text-slate-400">
          ({testimonials.length} verified review{testimonials.length === 1 ? "" : "s"})
        </span>
      </div>
      <div className="space-y-4">
        {testimonials.map((t) => (
          <article key={t.id} className="border-l-2 border-amber-200 pl-4">
            {t.rating !== null && (
              <div className="flex items-center gap-0.5 mb-1.5" aria-label={`${t.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`text-sm ${
                      t.rating !== null && t.rating >= n
                        ? "text-amber-500"
                        : "text-slate-200"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm text-slate-700 leading-relaxed mb-1.5">
              &ldquo;{t.testimonial}&rdquo;
            </p>
            <p className="text-xs text-slate-400">
              — Verified client · {formatDate(t.submitted_at)}
            </p>
          </article>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-4">
        Testimonials are collected anonymously from consumers ~4 weeks after engagement. General information only.
      </p>
    </section>
  );
}
