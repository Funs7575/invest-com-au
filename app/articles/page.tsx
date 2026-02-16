import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";
import ArticlesClient from "./ArticlesClient";

export const metadata = {
  title: "Investing Guides & Articles",
  description:
    "Expert guides on tax, SMSF, beginner investing, strategy, and market news. Make smarter investment decisions with independent Australian research.",
  openGraph: {
    title: "Investing Guides & Articles — Invest.com.au",
    description: "Expert guides on tax, SMSF, beginner investing, strategy, and market news.",
    images: [{ url: "/api/og?title=Investing+Guides&subtitle=Expert+guides+on+tax,+SMSF,+strategy&type=article", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false });

  return (
    <div className="py-12">
      <div className="container-custom">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold mb-3">
            Investing Guides &amp; Articles
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Expert guides to help you make smarter investment decisions — from
            tax strategies and SMSF tips to beginner walkthroughs and market
            news.
          </p>
        </div>

        <ArticlesClient articles={(articles as Article[]) || []} />
      </div>
    </div>
  );
}
