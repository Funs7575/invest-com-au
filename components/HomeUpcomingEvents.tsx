import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

interface EventProfessional {
  name: string;
  slug: string;
  photo_url: string | null;
}

interface AdvisorEvent {
  id: number;
  title: string;
  event_type: string | null;
  starts_at: string;
  location: string | null;
  price_cents: number | null;
  rsvp_count: number | null;
  professional: EventProfessional | null;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} · ${time} AEST`;
}

async function fetchUpcomingEvents(): Promise<AdvisorEvent[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("advisor_events")
      .select(
        "id, title, event_type, starts_at, location, price_cents, rsvp_count, professional:professionals(name, slug, photo_url)",
      )
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(3);
    return (data as unknown as AdvisorEvent[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Compact "upcoming events" strip inside the homepage experts band.
 * Three text rows, not a card grid — the full programme lives at /events.
 */
export default async function HomeUpcomingEvents() {
  const events = await fetchUpcomingEvents();
  if (events.length === 0) return null;

  return (
    <section style={{ padding: "0 36px 12px" }}>
      <div
        className="border border-slate-200 bg-white"
        style={{ maxWidth: 1280, margin: "0 auto", borderRadius: 14, overflow: "hidden" }}
      >
        <div
          className="border-b border-slate-100"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px" }}
        >
          <span className="iv2-mini" style={{ color: "var(--color-teal-700)" }}>
            ● Upcoming events by experts
          </span>
          <Link
            href="/events"
            style={{ fontSize: 12, fontWeight: 600, color: "var(--color-teal-700)", textDecoration: "none" }}
          >
            View all →
          </Link>
        </div>

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {events.map((event, i) => {
            const isFree = !event.price_cents || event.price_cents === 0;
            const priceDisplay = isFree
              ? "Free"
              : `$${Math.round(event.price_cents! / 100).toLocaleString("en-AU")}`;
            const pro = event.professional;
            return (
              <li key={event.id} className={i > 0 ? "border-t border-slate-100" : undefined}>
                <Link
                  href="/events"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    textDecoration: "none",
                    color: "inherit",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className="bg-teal-50 border border-teal-100"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--color-teal-800)",
                      padding: "3px 9px",
                      borderRadius: 99,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {formatEventDate(event.starts_at)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-900)", flex: 1, minWidth: 200 }}>
                    {event.title}
                  </span>
                  {pro && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-ink-500)", flexShrink: 0 }}>
                      {pro.photo_url && (
                        <span style={{ width: 20, height: 20, borderRadius: 99, overflow: "hidden", position: "relative", flexShrink: 0 }}>
                          <Image src={pro.photo_url} alt="" fill sizes="20px" style={{ objectFit: "cover" }} />
                        </span>
                      )}
                      {pro.name}
                    </span>
                  )}
                  {event.location && (
                    <span style={{ fontSize: 11.5, color: "var(--color-ink-400)", flexShrink: 0 }}>{event.location}</span>
                  )}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isFree ? "var(--color-emerald-700)" : "var(--color-ink-900)",
                      flexShrink: 0,
                    }}
                  >
                    {priceDisplay}
                  </span>
                  {event.rsvp_count && event.rsvp_count > 0 ? (
                    <span style={{ fontSize: 11, color: "var(--color-ink-400)", flexShrink: 0 }}>
                      {event.rsvp_count.toLocaleString("en-AU")} registered
                    </span>
                  ) : null}
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-teal-700)", flexShrink: 0 }}>
                    RSVP →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
