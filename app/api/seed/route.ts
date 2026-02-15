import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import siteData from "@/data/site-data.json";

const ADMIN_EMAILS = ["finnduns@gmail.com"];
const ADMIN_DOMAIN = "@invest.com.au";

export async function POST() {
  try {
    const supabase = await createClient();

    // Auth guard: require authenticated admin user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || (!ADMIN_EMAILS.includes(user.email || "") && !user.email?.endsWith(ADMIN_DOMAIN))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date().toISOString();

    // ── Brokers ──────────────────────────────────────────────────────
    const brokers = siteData.brokers.map((b) => ({
      name: b.name,
      slug: b.slug,
      color: b.color,
      icon: b.icon,
      cta_text: b.ctaText,
      tagline: b.tagline,
      asx_fee: b.asxFee,
      asx_fee_value: b.asxFeeValue,
      us_fee: b.usFee,
      us_fee_value: b.usFeeValue,
      fx_rate: b.fxRate,
      chess_sponsored: b.chessSponsored,
      inactivity_fee: b.inactivityFee,
      payment_methods: b.paymentMethods,
      smsf_support: b.smsfSupport,
      min_deposit: b.minDeposit,
      platforms: b.platforms,
      pros: b.pros,
      cons: b.cons,
      affiliate_url: b.affiliateUrl,
      rating: b.rating,
      layer: b.layer,
      deal: (b as Record<string, unknown>).dealOfMonth === true,
      deal_text: (b as Record<string, unknown>).dealText ?? null,
      is_crypto: (b as Record<string, unknown>).isCrypto === true,
      editors_pick: false,
      status: "active",
      created_at: now,
      updated_at: now,
    }));

    const { error: brokersError } = await supabase
      .from("brokers")
      .upsert(brokers, { onConflict: "slug" });

    if (brokersError) throw brokersError;

    // ── Articles (deduplicate by slug) ───────────────────────────────
    const seenSlugs = new Set<string>();
    const uniqueArticles = siteData.articles.filter((a) => {
      if (seenSlugs.has(a.slug)) return false;
      seenSlugs.add(a.slug);
      return true;
    });

    const articles = uniqueArticles.map((a) => ({
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      category: a.category,
      tags: a.tags,
      published_at: a.date,
      read_time: a.readTime,
      evergreen: a.evergreen,
      related_brokers: a.relatedBrokers,
      related_calc: a.relatedCalc,
      sections: a.sections,
      created_at: now,
      updated_at: now,
    }));

    const { error: articlesError } = await supabase
      .from("articles")
      .upsert(articles, { onConflict: "slug" });

    if (articlesError) throw articlesError;

    // ── Scenarios ────────────────────────────────────────────────────
    const scenarios = siteData.scenarios.map((s) => ({
      slug: s.slug,
      title: s.title,
      hero_title: s.heroTitle,
      icon: s.icon,
      problem: s.problem,
      solution: s.solution,
      brokers: s.brokers,
      considerations: s.considerations,
      created_at: now,
      updated_at: now,
    }));

    const { error: scenariosError } = await supabase
      .from("scenarios")
      .upsert(scenarios, { onConflict: "slug" });

    if (scenariosError) throw scenariosError;

    // ── Response ─────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      inserted: {
        brokers: brokers.length,
        articles: articles.length,
        scenarios: scenarios.length,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
