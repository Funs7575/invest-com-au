import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Scenario } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function ScenarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: scenario } = await supabase
    .from('scenarios')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!scenario) notFound();

  const s = scenario as Scenario;

  return (
    <div className="py-12">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/scenarios" className="hover:text-brand">Scenarios</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">{s.title}</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            {s.icon && <div className="text-5xl mb-4">{s.icon}</div>}
            <h1 className="text-4xl font-bold mb-4">{s.hero_title || s.title}</h1>
          </div>

          {/* Problem */}
          {s.problem && (
            <section className="mb-8 border-l-4 border-red-400 pl-6">
              <h2 className="text-xl font-bold text-red-700 mb-2">The Problem</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{s.problem}</p>
            </section>
          )}

          {/* Solution */}
          {s.solution && (
            <section className="mb-8 border-l-4 border-green-400 pl-6">
              <h2 className="text-xl font-bold text-green-700 mb-2">The Solution</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{s.solution}</p>
            </section>
          )}

          {/* Recommended Brokers */}
          {s.brokers && s.brokers.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">Recommended Brokers</h2>
              <div className="flex flex-wrap gap-3">
                {s.brokers.map((slug: string) => (
                  <Link
                    key={slug}
                    href={`/broker/${slug}`}
                    className="px-4 py-3 bg-amber/10 text-amber border border-amber/30 font-semibold rounded-lg hover:bg-amber/20 transition-colors"
                  >
                    {slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Considerations */}
          {s.considerations && s.considerations.length > 0 && (
            <section className="mb-8 border border-slate-200 rounded-lg p-6 bg-slate-50">
              <h2 className="text-xl font-bold mb-4">Key Considerations</h2>
              <ul className="space-y-3">
                {s.considerations.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-amber font-bold mt-0.5">&#8226;</span>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-12">
            <Link href="/scenarios" className="text-amber font-semibold hover:underline">
              &larr; Back to Scenarios
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
