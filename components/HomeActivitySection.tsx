import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { getLatestForUser } from "@/lib/quiz-history";

interface ActivityCard {
  label: string;
  href: string;
}

async function loadActivityCards(userId: string): Promise<ActivityCard[]> {
  const [serverClient, adminClient] = [await createClient(), createAdminClient()];

  const [shortlistRes, quizRes, advisorRes, comparisonRes] = await Promise.allSettled([
    serverClient
      .from("user_shortlisted_brokers")
      .select("broker_slug", { count: "exact", head: true })
      .eq("user_id", userId),
    getLatestForUser(userId),
    adminClient
      .from("user_bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("bookmark_type", "advisor"),
    adminClient
      .from("saved_broker_comparisons")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const cards: ActivityCard[] = [];

  if (shortlistRes.status === "fulfilled") {
    const n = (shortlistRes.value as { count: number | null }).count ?? 0;
    if (n > 0) {
      cards.push({
        label: `${n} broker${n !== 1 ? "s" : ""} in your shortlist`,
        href: "/shortlist",
      });
    }
  }

  if (quizRes.status === "fulfilled" && quizRes.value?.top_match_slug) {
    const slug = quizRes.value.top_match_slug;
    cards.push({
      label: `You matched with ${slug} — keep comparing`,
      href: `/broker/${slug}`,
    });
  }

  if (advisorRes.status === "fulfilled") {
    const n = (advisorRes.value as { count: number | null }).count ?? 0;
    if (n > 0) {
      cards.push({
        label: `You saved ${n} advisor${n !== 1 ? "s" : ""}`,
        href: "/account/bookmarks",
      });
    }
  }

  if (comparisonRes.status === "fulfilled") {
    const n = (comparisonRes.value as { count: number | null }).count ?? 0;
    if (n > 0) {
      cards.push({
        label: `You have ${n} saved comparison${n !== 1 ? "s" : ""}`,
        href: "/account/saved",
      });
    }
  }

  return cards.slice(0, 4);
}

export default async function HomeActivitySection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const cards = await loadActivityCards(user.id);
  if (cards.length === 0) return null;

  return (
    <section className="container-custom py-6">
      <p className="mb-3 text-sm font-semibold text-ink-500">
        Welcome back — pick up where you left off
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="group flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-sm transition-all hover:border-ink-200 hover:shadow-md"
            >
              <span className="text-sm font-medium text-ink-800 group-hover:text-coral-600">
                {card.label}
              </span>
              <span
                aria-hidden="true"
                className="ml-3 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-coral-400"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
