import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listBookmarks, type BookmarkRow } from "@/lib/bookmarks";
import BookmarksList from "./BookmarksList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Reading List — My Account",
  robots: "noindex, nofollow",
};

/**
 * /account/bookmarks — user's saved items.
 *
 * Accepts every bookmark type (article, broker, advisor,
 * scenario, calculator) and groups them in the client. The
 * server only decides who sees what; rendering + grouping
 * + remove happens client-side with a PATCH/DELETE round-trip.
 */
export default async function AccountBookmarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login?redirect=/account/bookmarks");
  }

  const items: BookmarkRow[] = await listBookmarks(user.id);

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
            My Reading List
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Articles, brokers and advisors you&rsquo;ve saved for later.
          </p>
        </div>

        <BookmarksList
          initialItems={items.map((i) => ({
            id: i.id,
            bookmark_type: i.bookmark_type,
            ref: i.ref,
            label: i.label,
            note: i.note,
            created_at: i.created_at,
          }))}
        />
      </div>
    </div>
  );
}
