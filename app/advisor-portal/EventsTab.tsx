"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Advisor } from "./types";

interface Event {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  meeting_url: string | null;
  max_attendees: number | null;
  price_cents: number;
  status: string;
  rsvp_count: number;
  created_at: string;
}

interface EventFormState {
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  location: string;
  meeting_url: string;
  max_attendees: string;
  price_cents: string;
  description: string;
}

const EMPTY_FORM: EventFormState = {
  title: "",
  event_type: "webinar",
  starts_at: "",
  ends_at: "",
  location: "",
  meeting_url: "",
  max_attendees: "",
  price_cents: "0",
  description: "",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  webinar: "bg-blue-100 text-blue-700",
  seminar: "bg-purple-100 text-purple-700",
  workshop: "bg-teal-100 text-teal-700",
  conference: "bg-indigo-100 text-indigo-700",
  networking: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-600",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

function formatEventDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

type Props = {
  advisor: Advisor | null;
};

export default function EventsTab({ advisor }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [rsvpModalEventId, setRsvpModalEventId] = useState<number | null>(null);
  const [rsvps, setRsvps] = useState<Record<number, { id: number; user_name: string | null; user_email: string; status: string }[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/advisor-auth/events");
      if (cancelled || !res.ok) return;
      const data = await res.json() as { events: Event[] };
      if (cancelled) return;
      setEvents(data.events ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Unused variable suppressed — advisor prop is accepted for consistency with other tabs
  void advisor;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        event_type: form.event_type,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
        description: form.description || null,
        location: form.location || null,
        meeting_url: form.meeting_url || null,
        price_cents: form.price_cents ? parseInt(form.price_cents, 10) : 0,
      };
      if (form.ends_at) body.ends_at = new Date(form.ends_at).toISOString();
      if (form.max_attendees) body.max_attendees = parseInt(form.max_attendees, 10);

      const res = await fetch("/api/advisor-auth/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to create event");
        return;
      }
      const { event } = await res.json() as { event: Event };
      setEvents((prev) => [...prev, event]);
      setShowCreateForm(false);
      setForm(EMPTY_FORM);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (eventId: number) => {
    const res = await fetch("/api/advisor-auth/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, status: "published" }),
    });
    if (res.ok) {
      const { event } = await res.json() as { event: Event };
      setEvents((prev) => prev.map((ev) => ev.id === eventId ? event : ev));
    }
  };

  const loadRsvps = async (eventId: number) => {
    const res = await fetch(`/api/advisor-auth/events/${eventId}/rsvps`);
    if (res.ok) {
      const data = await res.json() as { rsvps: { id: number; user_name: string | null; user_email: string; status: string }[] };
      setRsvps((prev) => ({ ...prev, [eventId]: data.rsvps }));
    }
    setRsvpModalEventId(eventId);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-24 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Events &amp; Webinars</h2>
          <p className="text-xs text-slate-500 mt-0.5">Create and manage your webinars, workshops, and events.</p>
        </div>
        <button
          onClick={() => { setShowCreateForm(true); setForm(EMPTY_FORM); setError(""); }}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5"
        >
          <Icon name="plus" size={16} /> Create Event
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">New Event</h3>
            <button onClick={() => { setShowCreateForm(false); setError(""); }} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Retirement Planning Webinar 2026"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Type</label>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                >
                  {["webinar", "seminar", "workshop", "conference", "networking", "other"].map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (AUD)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.price_cents === "0" ? "0" : form.price_cents}
                  onChange={(e) => setForm((f) => ({ ...f, price_cents: e.target.value }))}
                  placeholder="0 for free"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <p className="text-[0.6rem] text-slate-400 mt-0.5">Enter in cents (e.g. 1000 = $10.00)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Starts At *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ends At <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  maxLength={300}
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Sydney CBD or leave blank for online"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meeting URL <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  type="url"
                  value={form.meeting_url}
                  onChange={(e) => setForm((f) => ({ ...f, meeting_url: e.target.value }))}
                  placeholder="https://zoom.us/j/..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Attendees <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={form.max_attendees}
                  onChange={(e) => setForm((f) => ({ ...f, max_attendees: e.target.value }))}
                  placeholder="Leave blank for unlimited"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Description <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea
                  maxLength={3000}
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what attendees will learn or experience..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Creating..." : "Create Event"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setError(""); }}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="calendar" size={32} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No events yet</h3>
          <p className="text-xs text-slate-500 mb-4">Create a webinar or workshop to engage with advisors and investors.</p>
          <button
            onClick={() => { setShowCreateForm(true); setForm(EMPTY_FORM); setError(""); }}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700"
          >
            Create Your First Event
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Date */}
                  <p className="text-[0.65rem] text-slate-500 mb-1">{formatEventDate(ev.starts_at)}</p>

                  {/* Title + badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-sm font-bold text-slate-900">{ev.title}</h3>
                    <span className={`text-[0.55rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${EVENT_TYPE_COLORS[ev.event_type] ?? "bg-slate-100 text-slate-600"}`}>
                      {ev.event_type}
                    </span>
                    <span className={`text-[0.55rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[ev.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {ev.status}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-[0.62rem] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Icon name="map-pin" size={11} />
                      {ev.location ?? "Online"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="users" size={11} />
                      {ev.rsvp_count}{ev.max_attendees != null ? ` / ${ev.max_attendees}` : ""} RSVPs
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="tag" size={11} />
                      {ev.price_cents === 0 ? "Free" : `$${(ev.price_cents / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  {ev.status === "draft" && (
                    <button
                      onClick={() => void handlePublish(ev.id)}
                      className="text-xs px-2.5 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => void loadRsvps(ev.id)}
                    className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    View RSVPs
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RSVP modal */}
      {rsvpModalEventId != null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">RSVPs</h2>
              <button onClick={() => setRsvpModalEventId(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {(rsvps[rsvpModalEventId] ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No RSVPs yet.</p>
              ) : (
                <div className="space-y-2">
                  {(rsvps[rsvpModalEventId] ?? []).map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.user_name ?? "Anonymous"}</p>
                        <p className="text-xs text-slate-500">{r.user_email}</p>
                      </div>
                      <span className="text-[0.6rem] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full capitalize">{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
