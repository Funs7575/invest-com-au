import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import OfficeHoursLiveStream from "@/components/OfficeHoursLiveStream";
import RsvpButton from "@/components/RsvpButton";
import { breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 60; // 1 min ISR — status changes quickly

interface Question {
  id: number;
  session_id: number;
  display_name: string;
  question: string;
  is_anonymous: boolean;
  answer: string | null;
  answered_at: string | null;
  upvote_count: number;
  created_at: string;
}

interface Session {
  id: number;
  title: string;
  description: string | null;
  scheduled_at: string;
  ends_at: string | null;
  status: string;
  max_questions: number;
  rsvp_count: number;
  is_published: boolean;
  advisor_id: number;
  professionals: {
    id: number;
    name: string;
    slug: string;
    type: string;
    firm_name: string | null;
    headshot_url: string | null;
  } | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("advisor_office_hours")
    .select("title, description, professionals(name)")
    .eq("id", parseInt(id, 10))
    .eq("is_published", true)
    .single();

  if (!data) return { title: "Session not found" };

  const profRow = data.professionals;
  const advisor = profRow
    ? Array.isArray(profRow)
      ? (profRow[0] as { name: string } | undefined) ?? null
      : (profRow as unknown as { name: string })
    : null;
  return {
    title: `${data.title} — Advisor Office Hours`,
    description: data.description ?? `Live Q&A with ${advisor?.name ?? "an advisor"} on Invest.com.au`,
    alternates: { canonical: `${SITE_URL}/office-hours/${id}` },
  };
}

function fmtScheduled(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
    timeZoneName: "short",
  });
}

export default async function OfficeHoursSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (!Number.isInteger(sessionId) || sessionId <= 0) notFound();

  const supabase = await createClient();

  const [sessionResult, questionsResult] = await Promise.all([
    supabase
      .from("advisor_office_hours")
      .select("id, title, description, scheduled_at, ends_at, status, max_questions, rsvp_count, is_published, advisor_id, professionals(id, name, slug, type, firm_name, headshot_url)")
      .eq("id", sessionId)
      .eq("is_published", true)
      .single(),
    supabase
      .from("office_hour_questions")
      .select("id, session_id, display_name, question, is_anonymous, answer, answered_at, upvote_count, created_at")
      .eq("session_id", sessionId)
      .eq("is_removed", false)
      .order("upvote_count", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  if (!sessionResult.data) notFound();

  const session = sessionResult.data as unknown as Session;
  const questions = (questionsResult.data ?? []) as Question[];
  const isTranscript = session.status === "transcript";
  const advisor = session.professionals;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advisor Office Hours", url: absoluteUrl("/office-hours") },
    { name: session.title },
  ]);

  // QAPage schema for transcripts (schema.org)
  const qaSchema = isTranscript && questions.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "QAPage",
        name: session.title,
        url: `${SITE_URL}/office-hours/${sessionId}`,
        description: session.description ?? undefined,
        mainEntity: questions
          .filter((q) => q.answer)
          .map((q) => ({
            "@type": "Question",
            name: q.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: q.answer,
            },
          })),
      }
    : null;

  // Event schema for upcoming/live sessions
  const eventSchema = !isTranscript
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: session.title,
        description: session.description ?? undefined,
        startDate: session.scheduled_at,
        endDate: session.ends_at ?? undefined,
        eventStatus:
          session.status === "live"
            ? "https://schema.org/EventScheduled"
            : "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        location: {
          "@type": "VirtualLocation",
          url: `${SITE_URL}/office-hours/${sessionId}`,
        },
        url: `${SITE_URL}/office-hours/${sessionId}`,
      }
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {qaSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(qaSchema) }}
        />
      )}
      {eventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-900">Home</Link>
        <span className="text-slate-300">/</span>
        <Link href="/office-hours" className="hover:text-slate-900">Office Hours</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium line-clamp-1">{session.title}</span>
      </nav>

      {/* Session header */}
      <header className="mb-6">
        <div className="flex items-start gap-4 mb-4">
          {advisor?.headshot_url ? (
            <Image
              src={advisor.headshot_url}
              alt={advisor.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-indigo-600 font-bold">{advisor?.name?.[0] ?? "A"}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{session.title}</h1>
            {advisor && (
              <p className="text-sm text-slate-600">
                with{" "}
                <Link
                  href={`/advisors/${advisor.slug}`}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  {advisor.name}
                </Link>
                {advisor.firm_name && (
                  <span className="text-slate-400"> · {advisor.firm_name}</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="font-medium">{fmtScheduled(session.scheduled_at)}</span>
          {session.rsvp_count > 0 && (
            <span>{session.rsvp_count} RSVP{session.rsvp_count !== 1 ? "s" : ""}</span>
          )}
        </div>

        {session.description && (
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">{session.description}</p>
        )}

        {/* RSVP button for upcoming/live sessions */}
        {(session.status === "upcoming" || session.status === "live") && (
          <div className="mt-4">
            <RsvpButton sessionId={session.id} />
          </div>
        )}
      </header>

      {/* Q&A stream */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
          {isTranscript ? "Questions & answers" : "Questions"}
        </h2>
        <OfficeHoursLiveStream
          sessionId={session.id}
          sessionStatus={session.status as "upcoming" | "live" | "ended" | "transcript" | "draft"}
          initialQuestions={questions}
          maxQuestions={session.max_questions}
        />
      </section>

      <footer className="mt-10 pt-4 border-t border-slate-200">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong className="text-slate-500">General Advice Warning:</strong>{" "}
          {GENERAL_ADVICE_WARNING}
        </p>
      </footer>
    </div>
  );
}
