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

function formatEventType(raw: string | null): string {
  if (!raw) return "Event";
  return raw
    .split("_")
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function EventCard({ event }: { event: AdvisorEvent }) {
  const isFree = !event.price_cents || event.price_cents === 0;
  const priceDisplay = isFree
    ? "Free"
    : `$${Math.round(event.price_cents! / 100).toLocaleString("en-AU")}`;
  const professional = event.professional ?? null;
  const initials = professional
    ? professional.name
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div
      className="iv2-card"
      style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}
    >
      <div style={{ padding: "14px 14px 10px" }}>
        {event.event_type && (
          <span
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--color-teal-700)",
              background: "var(--color-teal-50)",
              border: "1px solid var(--color-teal-200)",
              borderRadius: 99,
              padding: "2px 8px",
              marginBottom: 8,
            }}
          >
            {formatEventType(event.event_type)}
          </span>
        )}
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          {event.title}
        </h3>

        {professional && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 99,
                overflow: "hidden",
                flexShrink: 0,
                background: "var(--color-ink-700)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 10,
                position: "relative",
              }}
            >
              {professional.photo_url ? (
                <Image
                  src={professional.photo_url}
                  alt={professional.name}
                  fill
                  sizes="28px"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                initials
              )}
            </div>
            <span style={{ fontSize: 12, color: "var(--color-ink-600)", fontWeight: 600 }}>
              {professional.name}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid #e5e7eb",
          background: "var(--color-teal-50)",
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 11.5, color: "var(--color-teal-800)", fontWeight: 600 }}>
          {formatEventDate(event.starts_at)}
        </div>
        {event.location && (
          <div style={{ fontSize: 11, color: "var(--color-ink-500)" }}>{event.location}</div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isFree ? "var(--color-emerald-700)" : "var(--color-ink-900)",
            }}
          >
            {priceDisplay}
          </span>
          <Link
            href="/events"
            className="iv2-cta"
            style={{ fontSize: 11.5, padding: "5px 12px", background: "var(--color-teal-600)" }}
          >
            RSVP
          </Link>
        </div>
        {event.rsvp_count && event.rsvp_count > 0 ? (
          <div style={{ fontSize: 10.5, color: "var(--color-ink-400)" }}>
            {event.rsvp_count.toLocaleString("en-AU")} registered
          </div>
        ) : null}
      </div>
    </div>
  );
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
      .limit(4);
    return (data as unknown as AdvisorEvent[]) ?? [];
  } catch {
    return [];
  }
}

export default async function HomeUpcomingEvents() {
  const events = await fetchUpcomingEvents();
  if (events.length === 0) return null;

  return (
      <section
        style={{
          padding: "52px 36px",
          background: "linear-gradient(135deg, #f0fdfa 0%, #e6fffa 100%)",
          borderTop: "1px solid var(--color-teal-100)",
          borderBottom: "1px solid var(--color-teal-100)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <span className="iv2-mini" style={{ color: "var(--color-teal-700)" }}>
                ● Upcoming Events
              </span>
              <h2
                className="font-display"
                style={{
                  fontSize: 28,
                  letterSpacing: "-.026em",
                  fontWeight: 800,
                  margin: "4px 0 0",
                  lineHeight: 1.1,
                  textWrap: "balance",
                  color: "var(--color-ink-900)",
                }}
              >
                Learn from experts. Live.
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-ink-500)",
                  margin: "6px 0 0",
                  maxWidth: 520,
                  lineHeight: 1.5,
                }}
              >
                Webinars, workshops and seminars with Australia&apos;s leading financial advisors.
              </p>
            </div>
            <Link href="/events" className="iv2-cta-ghost" style={{ fontSize: 12.5 }}>
              View all events →
            </Link>
          </div>

          <div className="home-events-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .home-events-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 640px) {
            .home-events-grid {
              grid-template-columns: 1fr !important;
              display: flex !important;
              flex-wrap: nowrap !important;
              overflow-x: auto !important;
              gap: 10px !important;
            }
            .home-events-grid > * { min-width: 260px; }
          }
        `}</style>
      </section>
    );
}
