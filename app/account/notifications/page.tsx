import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import NotificationsList from "./NotificationsList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications — My Account",
  robots: "noindex, nofollow",
};

/**
 * /account/notifications — in-app inbox.
 *
 * Lists the last 50 notifications. Unread count in the header
 * bell. Client-side mark-as-read via PATCH /api/account/notifications.
 */
export default async function AccountNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login?redirect=/account/notifications");
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_notifications")
    .select("id, type, title, body, link_url, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = data || [];
  const unread = items.filter((i) => i.read_at == null).length;

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
            <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500">
              {unread === 0 ? "All caught up" : `${unread} unread`}
            </p>
          </div>
        </div>

        <NotificationsList
          initialItems={items.map((i) => ({
            id: i.id as number,
            type: i.type as string,
            title: i.title as string,
            body: i.body as string | null,
            link_url: i.link_url as string | null,
            read_at: i.read_at as string | null,
            created_at: i.created_at as string,
          }))}
        />
      </div>
    </div>
  );
}
