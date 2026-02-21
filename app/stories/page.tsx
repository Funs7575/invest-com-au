import { createClient } from "@/lib/supabase/server";
import type { SwitchStory } from "@/lib/types";
import StoriesClient from "./StoriesClient";

export const metadata = {
  title: "Broker Switching Stories",
  description: "Real stories from Australians who switched share trading platforms. Find out why people moved, what they saved, and whether they're happy.",
  openGraph: {
    title: "Broker Switching Stories — Invest.com.au",
    description: "Real stories from Australians who switched share trading platforms. Find out why people moved, what they saved, and whether they're happy.",
    images: [{ url: "/api/og?title=Switching+Stories&subtitle=Real+stories+from+Aussies+who+switched+brokers&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/stories" },
};

export const revalidate = 3600;

export default async function StoriesPage() {
  const supabase = await createClient();

  const [{ data: stories }, { data: brokers }] = await Promise.all([
    supabase
      .from("switch_stories")
      .select("id, source_broker_id, source_broker_slug, dest_broker_id, dest_broker_slug, display_name, title, body, reason, source_rating, dest_rating, estimated_savings, time_with_source, status, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("brokers")
      .select("slug, name")
      .eq("status", "active")
      .order("name"),
  ]);

  return (
    <StoriesClient
      stories={(stories || []) as SwitchStory[]}
      brokers={(brokers || []) as { slug: string; name: string }[]}
    />
  );
}
