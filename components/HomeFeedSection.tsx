import { createClient } from "@/lib/supabase/server";
 
import { createAdminClient } from "@/lib/supabase/admin";
import HomeFeedTabs from "@/components/HomeFeedTabs";
import { rankFeedEvents, type FeedEvent } from "@/lib/feed-ranking";

const INITIAL_LIMIT = 6; // homepage teaser — "load more" + the /feed page carry the rest
const FETCH_LIMIT = 24; // fetch wider than we show so ranking has a pool to sort

export default async function HomeFeedSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Personalisation: which advisor post ref_ids does this user follow?
  const { data: follows } = await supabase
    .from("advisor_follows")
    .select("following_professional_id")
    .eq("follower_user_id", user.id);
  const followedAdvisorRefIds = new Set(
    (follows ?? []).map((f) => String(f.following_professional_id)),
  );

  // Fetch initial batch from the feed — admin client for cross-user read
  const { data } = await createAdminClient()
    .from("feed_events")
    .select(
      "id, event_type, ref_id, headline, summary, actor_name, actor_slug, entity_slug, image_url, score_base, published_at",
    )
    .lt("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(FETCH_LIMIT);

  const rows = (data ?? []) as FeedEvent[];
  const ranked = rankFeedEvents(rows, followedAdvisorRefIds);
  const initialEvents = ranked.slice(0, INITIAL_LIMIT);

  // Cursor for next page — use the published_at of the last pre-ranked event
  // so chronological pagination continues from where we stopped fetching.
  const lastRow = rows[rows.length - 1];
  const initialCursor =
    rows.length >= FETCH_LIMIT && lastRow ? lastRow.published_at : null;

  return (
    <HomeFeedTabs initialEvents={initialEvents} initialCursor={initialCursor} />
  );
}
