import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: brokers, error } = await supabase
    .from("brokers")
    .select("id, slug, name, fee_source_url, fee_page_hash")
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { slug: string; status: string; changed: boolean }[] = [];

  for (const broker of brokers || []) {
    if (!broker.fee_source_url) {
      // Still update the timestamp even without a URL
      await supabase
        .from("brokers")
        .update({ fee_last_checked: new Date().toISOString() })
        .eq("id", broker.id);
      results.push({ slug: broker.slug, status: "no_url", changed: false });
      continue;
    }

    try {
      const resp = await fetch(broker.fee_source_url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "InvestComAu-FeeChecker/1.0" },
      });

      if (!resp.ok) {
        await supabase
          .from("brokers")
          .update({ fee_last_checked: new Date().toISOString() })
          .eq("id", broker.id);
        results.push({ slug: broker.slug, status: `http_${resp.status}`, changed: false });
        continue;
      }

      const text = await resp.text();
      const pageHash = simpleHash(text.slice(0, 5000));
      const changed = broker.fee_page_hash != null && broker.fee_page_hash !== pageHash;

      await supabase
        .from("brokers")
        .update({
          fee_last_checked: new Date().toISOString(),
          fee_page_hash: pageHash,
        })
        .eq("id", broker.id);

      results.push({
        slug: broker.slug,
        status: "ok",
        changed,
      });
    } catch {
      await supabase
        .from("brokers")
        .update({ fee_last_checked: new Date().toISOString() })
        .eq("id", broker.id);
      results.push({ slug: broker.slug, status: "fetch_error", changed: false });
    }
  }

  const changedCount = results.filter((r) => r.changed).length;

  return NextResponse.json({
    checked: results.length,
    changed: changedCount,
    results,
    timestamp: new Date().toISOString(),
  });
}
