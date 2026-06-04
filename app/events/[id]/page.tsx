import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import RsvpButton from "./RsvpButton";

export const revalidate = 300;

const EVENT_TYPE_COLORS: Record<string, string> = {
  webinar: "bg-blue-100 text-blue-700",
  seminar: "bg-purple-100 text-purple-700",
  workshop: "bg-teal-100 text-teal-700",
  conference: "bg-indigo-100 text-indigo-700",
  networking: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-600",
};

interface Professional {
  id: number;
  name: string;
  firm_name: string | null;
  slug: string;
  profile_image_url: string | null;
  location_state: string | null;
}

interface AdvisorEvent {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string | null;
  location: string | null;
  meeting_url: string | null;
  max_attendees: number | null;
  price_cents: number;
  status: string;
  rsvp_count: number;
  cover_image_url: string | null;
  professional_id: number | null;
  professional: Professional | null;
}

function formatEventDate(isoString: string, timezone?: string | null): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone ?? undefined,
    timeZoneName: "short",
  });
}

function formatShortDate(isoString: string, timezone?: string | null): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone ?? undefined,
    timeZoneName: "short",
  });
}

function eventJsonLd(event: AdvisorEvent) {
  const url = absoluteUrl(`/events/${event.id}`);
  const organizer = event.professional
    ? {
        "@type": "Person",
        name: event.professional.name,
        url: absoluteUrl(`/advisor/${event.professional.slug}`),
      }
    : { "@type": "Organization", name: SITE_NAME };

  const location =
    event.location
      ? { "@type": "Place", name: event.location }
      : { "@type": "VirtualLocation", url: event.meeting_url ?? url };

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.starts_at,
    endDate: event.ends_at ?? undefined,
    url,
    location,
    organizer,
    eventStatus: event.status === "cancelled"
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: event.location
      ? "https://schema.org/OfflineEventAttendanceMode"
      : "https://schema.org/OnlineEventAttendanceMode",
    offers: {
      "@type": "Offer",
      price: event.price_cents === 0 ? "0" : (event.price_cents / 100).toFixed(2),
      priceCurrency: "AUD",
      availability:
        event.max_attendees == null || event.rsvp_count < event.max_attendees
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url,
    },
    image: event.cover_image_url ?? undefined,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return { robots: { index: false } };

  const supabase = await createClient();
  const { data } = await supabase
    .from("advisor_events")
    .select("title, starts_at, description, event_type")
    .eq("id", idNum)
    .eq("status", "published")
    .single();

  if (!data) return { robots: { index: false } };

  const dateStr = formatShortDate(data.starts_at as string);
  const title = `${data.title as string} — ${data.event_type as string} | ${SITE_NAME}`;
  const description =
    (data.description as string | null) ??
    `Join this ${data.event_type as string} on ${dateStr}. Register now on ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: `/events/${idNum}` },
    openGraph: {
      title: data.title as string,
      description,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) notFound();

  const supabase = await createClient();

  // Auth check + event fetch in parallel
  const [authResult, eventResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("advisor_events")
      .select(
        "*, professional:professionals(id, name, firm_name, slug, profile_image_url, location_state)"
      )
      .eq("id", idNum)
      .single(),
  ]);

  const user = authResult.data.user;
  const rawEvent = eventResult.data as unknown as AdvisorEvent | null;

  if (!rawEvent || rawEvent.status !== "published" && rawEvent.status !== "cancelled") {
    notFound();
  }

  // Check if user is already registered
  let isRegistered = false;
  if (user) {
    const { data: rsvp } = await supabase
      .from("advisor_event_rsvps")
      .select("id")
      .eq("event_id", idNum)
      .eq("user_id", user.id)
      .maybeSingle();
    isRegistered = !!rsvp;
  }

  const event = rawEvent;
  const typeColor = EVENT_TYPE_COLORS[event.event_type] ?? "bg-slate-100 text-slate-600";
  const isFull = event.max_attendees != null && event.rsvp_count >= event.max_attendees;
  const isCancelled = event.status === "cancelled";
  const priceDisplay = event.price_cents === 0 ? "Free" : `$${(event.price_cents / 100).toFixed(2)}`;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Events & Webinars", url: absoluteUrl("/events") },
    { name: event.title },
  ]);

  const eventLd = eventJsonLd(event);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }}
      />

      <div className="py-8 md:py-12">
        <div className="max-w-3xl mx-auto px-4">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-500 mb-6 flex flex-wrap gap-x-1 items-center">
            <Link href="/" className="hover:text-brand transition-colors">Home</Link>
            <span className="mx-1">/</span>
            <Link href="/events" className="hover:text-brand transition-colors">Events &amp; Webinars</Link>
            <span className="mx-1">/</span>
            <span className="text-slate-900 font-medium truncate max-w-[14rem]">{event.title}</span>
          </div>

          {/* Cover image */}
          {event.cover_image_url && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 bg-slate-100">
              <Image
                src={event.cover_image_url}
                alt={event.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 720px"
                priority
              />
            </div>
          )}

          {/* Type badge + cancelled badge */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={`text-[0.65rem] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${typeColor}`}
            >
              {event.event_type}
            </span>
            {isCancelled && (
              <span className="text-[0.65rem] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide bg-red-100 text-red-700">
                Cancelled
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4 leading-tight">
            {event.title}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Main content */}
            <div className="md:col-span-2 space-y-6">
              {/* Date/time */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatEventDate(event.starts_at, event.timezone)}
                  </p>
                  {event.ends_at && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ends {formatShortDate(event.ends_at, event.timezone)}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {event.location ?? "Online"}
                  </p>
                  {!event.location && event.meeting_url && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Meeting link sent after registration
                    </p>
                  )}
                </div>
              </div>

              {/* Host */}
              {event.professional && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 shrink-0 mt-0.5 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                    {event.professional.profile_image_url ? (
                      <Image
                        src={event.professional.profile_image_url}
                        alt={event.professional.name}
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Hosted by</p>
                    <Link
                      href={`/advisor/${event.professional.slug}`}
                      className="text-sm font-semibold text-slate-900 hover:text-violet-600 transition-colors"
                    >
                      {event.professional.name}
                    </Link>
                    {event.professional.firm_name && (
                      <p className="text-xs text-slate-500 mt-0.5">{event.professional.firm_name}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div>
                  <h2 className="text-base font-bold text-slate-900 mb-2">About this event</h2>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: registration card */}
            <div className="md:col-span-1">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 sticky top-20">
                {/* Price */}
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Price</p>
                  <p className="text-xl font-extrabold text-slate-900">{priceDisplay}</p>
                </div>

                {/* Capacity */}
                {event.max_attendees != null && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Spots filled</span>
                      <span>
                        {event.rsvp_count} / {event.max_attendees}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-violet-500 h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((event.rsvp_count / event.max_attendees) * 100))}%`,
                        }}
                      />
                    </div>
                    {isFull && (
                      <p className="text-xs text-red-600 mt-1 font-medium">Event is full</p>
                    )}
                  </div>
                )}

                {event.max_attendees == null && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Registered</p>
                    <p className="text-sm font-semibold text-slate-900">{event.rsvp_count} attendees</p>
                  </div>
                )}

                {/* RSVP button */}
                <RsvpButton
                  eventId={event.id}
                  isAuthenticated={!!user}
                  isRegistered={isRegistered}
                  isFull={isFull}
                  isCancelled={isCancelled}
                />

                {/* Price note */}
                {event.price_cents > 0 && !isCancelled && (
                  <p className="text-[0.6rem] text-slate-400 text-center">
                    Payment details will be provided after registration.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Back link */}
          <div className="mt-10 pt-6 border-t border-slate-100">
            <Link
              href="/events"
              className="text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors"
            >
              &larr; All Events &amp; Webinars
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
