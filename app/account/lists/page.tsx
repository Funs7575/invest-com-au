import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import ListsClient, { type ListRow } from "./ListsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Lists — My Account",
  robots: "noindex, nofollow",
};

export default async function AccountListsPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/account/lists");
  }

  const { data } = await supabase
    .from("user_lists")
    .select(
      "id, title, description, slug, is_public, item_count, follower_count, created_at, updated_at",
    )
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false });

  const initialLists: ListRow[] = (data ?? []).map((r) => ({
    id: r.id as number,
    title: r.title,
    description: r.description ?? "",
    slug: r.slug,
    is_public: Boolean(r.is_public),
    item_count: Number(r.item_count),
    follower_count: Number(r.follower_count),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/account" className="hover:text-violet-600">Account</Link>
          <span aria-hidden>›</span>
          <span className="text-slate-700">My Lists</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">My Lists</h1>
        <p className="text-sm text-slate-600 mt-1">
          Curate shortlists of brokers, ETFs, advisors, and articles. Publish as public lists to
          share with the community or keep private for personal research.
        </p>
      </header>

      <ListsClient initialLists={initialLists} />
    </main>
  );
}
