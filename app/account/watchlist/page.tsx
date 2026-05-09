import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WatchlistClient from "./WatchlistClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Watchlist — My Account",
  robots: "noindex, nofollow",
};

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login?redirect=/account/watchlist");
  }

  const { data } = await supabase
    .from("user_watchlist_items")
    .select("id, item_type, item_slug, display_name, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const items = (data ?? []).map((row) => ({
    id: row.id as number,
    item_type: row.item_type as string,
    item_slug: row.item_slug as string,
    display_name: row.display_name as string | null,
    added_at: row.added_at as string,
  }));

  return (
    <div className="py-6 md:py-10">
      <div className="container-custom max-w-3xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/account" className="hover:text-slate-900">
            ← My account
          </Link>
        </nav>
        <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Watchlist</h1>
            <p className="text-sm text-slate-500">
              {items.length === 0
                ? "No items yet"
                : `${items.length} item${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <WatchlistClient initialItems={items} />
      </div>
    </div>
  );
}
