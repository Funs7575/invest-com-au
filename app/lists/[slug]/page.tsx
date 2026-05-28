import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ListFollowButton from "./ListFollowButton";

// Revalidate every 60s — list edits are infrequent, no need for force-dynamic.
export const revalidate = 60;

interface Params {
  params: Promise<{ slug: string }>;
}

interface ListRow {
  id: number;
  owner_user_id: string;
  title: string;
  description: string;
  slug: string;
  is_public: boolean;
  item_count: number;
  follower_count: number;
  created_at: string;
}

interface ItemRow {
  id: number;
  item_type: string;
  item_ref: string;
  label: string;
  notes: string;
  added_at: string;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_lists")
    .select("title, description")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (!data) return { title: "List not found" };
  return {
    title: `${data.title} — Invest.com.au`,
    description: data.description || `A curated investment list on Invest.com.au`,
    alternates: { canonical: absoluteUrl(`/lists/${slug}`) },
    openGraph: {
      title: `${data.title} — Invest.com.au`,
      description: data.description || `A curated investment list on Invest.com.au`,
      url: absoluteUrl(`/lists/${slug}`),
    },
  };
}

const ITEM_TYPE_CONFIG: Record<string, { label: string; emoji: string; href: (ref: string) => string }> = {
  broker: { label: "Broker / Platform", emoji: "📈", href: (r) => `/brokers/${r}` },
  etf: { label: "ETF", emoji: "📊", href: (r) => `/etfs/${r}` },
  article: { label: "Article", emoji: "📰", href: (r) => `/articles/${r}` },
  advisor: { label: "Advisor", emoji: "🧑‍💼", href: (r) => `/advisors/${r}` },
  property: { label: "Property", emoji: "🏠", href: (r) => `/property/${r}` },
};

export default async function PublicListPage({ params }: Params) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch list — only public lists are visible.
  const { data: listRow } = await supabase
    .from("user_lists")
    .select("id, owner_user_id, title, description, slug, is_public, item_count, follower_count, created_at")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (!listRow) notFound();
  const list = listRow as ListRow;

  // Fetch items.
  const { data: itemRows } = await supabase
    .from("user_list_items")
    .select("id, item_type, item_ref, label, notes, added_at")
    .eq("list_id", list.id)
    .order("added_at", { ascending: true });

  const items = (itemRows ?? []) as ItemRow[];

  // Check if current user is following.
  let userId: string | null = null;
  let isFollowing = false;
  let isOwner = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    isOwner = userId === list.owner_user_id;

    if (userId && !isOwner) {
      const { data: follow } = await supabase
        .from("user_list_follows")
        .select("id")
        .eq("list_id", list.id)
        .eq("follower_user_id", userId)
        .maybeSingle();
      isFollowing = follow != null;
    }
  } catch {
    // Not authenticated.
  }

  const createdLabel = new Date(list.created_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const grouped = items.reduce<Record<string, ItemRow[]>>((acc, item) => {
    const key = item.item_type;
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{list.title}</h1>
            {list.description && (
              <p className="text-slate-600 mt-1">{list.description}</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              {list.item_count} {list.item_count === 1 ? "item" : "items"} ·{" "}
              {list.follower_count} {list.follower_count === 1 ? "follower" : "followers"} · created {createdLabel}
            </p>
          </div>
          {!isOwner && (
            <div className="shrink-0 flex flex-col items-end gap-2">
              <ListFollowButton
                slug={slug}
                initialFollowing={isFollowing}
                isAuthenticated={userId !== null}
              />
              <form action={`/api/user-lists/${slug}/clone`} method="post">
                <button
                  type="submit"
                  className="text-xs text-slate-500 hover:text-violet-700 underline"
                >
                  Clone list →
                </button>
              </form>
            </div>
          )}
          {isOwner && (
            <Link
              href="/account/lists"
              className="shrink-0 text-xs text-violet-600 hover:underline"
            >
              Edit list →
            </Link>
          )}
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-3xl mb-2" aria-hidden>📋</p>
          <p>This list is empty.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, typeItems]) => {
            const config = ITEM_TYPE_CONFIG[type] ?? { label: type, emoji: "•", href: (r: string) => `/${r}` };
            return (
              <section key={type}>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {config.emoji} {config.label} ({typeItems.length})
                </h2>
                <div className="space-y-2">
                  {typeItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          href={config.href(item.item_ref)}
                          className="text-sm font-medium text-violet-700 hover:underline truncate block"
                        >
                          {item.label || item.item_ref}
                        </Link>
                        {item.notes && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <footer className="mt-8 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">{GENERAL_ADVICE_WARNING}</p>
        <p className="text-xs text-slate-400 mt-1">
          This is a community-curated list. Invest.com.au does not endorse any specific product.{" "}
          <Link href="/lists" className="hover:underline">Browse public lists →</Link>
        </p>
      </footer>
    </main>
  );
}
