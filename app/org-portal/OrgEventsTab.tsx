"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Organisation } from "./types";

interface OrgEvent {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: string | null;
  meeting_url: string | null;
  max_attendees: number | null;
  price_cents: number;
  status: string;
  rsvp_count: number;
  created_at: string;
}

type Props = {
  org: Organisation | null;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  webinar: "Webinar",
  seminar: "Seminar",
  workshop: "Workshop",
  conference: "Conference",
  networking: "Networking",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
};

const EVENT_TYPES = ["webinar", "seminar", "workshop", "conference", "networking", "other"] as const;
type EventType = (typeof EVENT_TYPES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["published"],
  published: ["cancelled", "completed"],
  completed: [],
  cancelled: [],
};

function formatDateLocal(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Convert a datetime-local value (e.g. "2026-08-15T09:00") to ISO 8601 with Z
function toISOString(dtLocal: string): string {
  if (!dtLocal) return "";
  return new Date(dtLocal).toISOString();
}

// Convert an ISO timestamp to a datetime-local input value
function toDatetimeLocal(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EventFormState {
  title: string;
  description: string;
  event_type: EventType;
  starts_at: string; // datetime-local value
  ends_at: string;   // datetime-local value
  location: string;
  meeting_url: string;
  max_attendees: string;
  price_dollars: string;
}

const EMPTY_FORM: EventFormState = {
  title: "",
  description: "",
  event_type: "webinar",
  starts_at: "",
  ends_at: "",
  location: "",
  meeting_url: "",
  max_attendees: "",
  price_dollars: "0",
};

export default function OrgEventsTab({ org: _org }: Props) {
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit modal
  const [editingEvent, setEditingEvent] = useState<OrgEvent | null>(null);
  const [editForm, setEditForm] = useState<EventFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org-auth/events");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setEvents(data.events ?? []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const patchField = (setter: React.Dispatch<React.SetStateAction<EventFormState>>) =>
    (field: keyof EventFormState, value: string) =>
      setter((prev) => ({ ...prev, [field]: value }));

  const setFormField = patchField(setForm);
  const setEditFormField = patchField(setEditForm);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.starts_at) return;
    setCreating(true);
    setCreateError("");
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        event_type: form.event_type,
        starts_at: toISOString(form.starts_at),
        price_cents: Math.round(parseFloat(form.price_dollars || "0") * 100),
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.ends_at) body.ends_at = toISOString(form.ends_at);
      if (form.location.trim()) body.location = form.location.trim();
      if (form.meeting_url.trim()) body.meeting_url = form.meeting_url.trim();
      if (form.max_attendees) body.max_attendees = parseInt(form.max_attendees, 10);

      const res = await fetch("/api/org-auth/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setEvents((prev) => [data.event, ...prev]);
        setShowCreate(false);
        setForm(EMPTY_FORM);
      } else {
        const d = await res.json();
        setCreateError(d.error ?? "Failed to create event.");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    }
    setCreating(false);
  };

  const openEdit = (event: OrgEvent) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      description: event.description ?? "",
      event_type: event.event_type as EventType,
      starts_at: toDatetimeLocal(event.starts_at),
      ends_at: event.ends_at ? toDatetimeLocal(event.ends_at) : "",
      location: event.location ?? "",
      meeting_url: event.meeting_url ?? "",
      max_attendees: event.max_attendees != null ? String(event.max_attendees) : "",
      price_dollars: (event.price_cents / 100).toFixed(2),
    });
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editingEvent || !editForm.title.trim() || !editForm.starts_at) return;
    setSaving(true);
    setEditError("");
    try {
      const body: Record<string, unknown> = {
        title: editForm.title.trim(),
        event_type: editForm.event_type,
        starts_at: toISOString(editForm.starts_at),
        price_cents: Math.round(parseFloat(editForm.price_dollars || "0") * 100),
        description: editForm.description.trim() || null,
        ends_at: editForm.ends_at ? toISOString(editForm.ends_at) : null,
        location: editForm.location.trim() || null,
        meeting_url: editForm.meeting_url.trim() || null,
        max_attendees: editForm.max_attendees ? parseInt(editForm.max_attendees, 10) : null,
      };

      const res = await fetch(`/api/org-auth/events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? data.event : e)));
        setEditingEvent(null);
      } else {
        const d = await res.json();
        setEditError(d.error ?? "Failed to save changes.");
      }
    } catch {
      setEditError("Network error. Please try again.");
    }
    setSaving(false);
  };

  const handleStatusChange = async (event: OrgEvent, newStatus: string) => {
    try {
      const res = await fetch(`/api/org-auth/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === event.id ? data.event : e)));
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (eventId: number) => {
    setDeleteError("");
    try {
      const res = await fetch(`/api/org-auth/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        setDeletingId(null);
      } else {
        const d = await res.json();
        setDeleteError(d.error ?? "Failed to delete event.");
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    }
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
          <h1 className="text-xl font-bold text-slate-900">Events</h1>
          <p className="text-sm text-slate-500">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); setCreateError(""); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Icon name="plus" size={16} />
          Create Event
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-teal-200 rounded-xl p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">New Event</h2>
          <EventFormFields form={form} setField={setFormField} />
          {createError && <p role="alert" className="text-xs text-red-600 mt-2">{createError}</p>}
          <div className="flex gap-2 pt-3">
            <button
              onClick={handleCreate}
              disabled={creating || !form.title.trim() || !form.starts_at}
              className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? "Creating..." : "Create Event"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setCreateError(""); }}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onKeyDown={(e) => { if (e.key === "Escape") { setEditingEvent(null); setEditError(""); } }}>
          <div role="dialog" aria-modal="true" aria-labelledby="org-edit-event-title" className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <h2 id="org-edit-event-title" className="text-sm font-bold text-slate-900 mb-4">Edit Event</h2>
            <EventFormFields form={editForm} setField={setEditFormField} />
            {editError && <p role="alert" className="text-xs text-red-600 mt-2">{editError}</p>}
            <div className="flex gap-2 pt-3">
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.title.trim() || !editForm.starts_at}
                className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditingEvent(null); setEditError(""); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onKeyDown={(e) => { if (e.key === "Escape") { setDeletingId(null); setDeleteError(""); } }}>
          <div role="dialog" aria-modal="true" aria-labelledby="org-delete-event-title" className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 id="org-delete-event-title" className="text-sm font-bold text-slate-900 mb-2">Delete Event?</h2>
            <p className="text-xs text-slate-500 mb-4">
              This will permanently delete this draft event. This cannot be undone.
            </p>
            {deleteError && <p className="text-xs text-red-600 mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => { setDeletingId(null); setDeleteError(""); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event list */}
      {events.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="calendar" size={32} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No events yet</h3>
          <p className="text-xs text-slate-500 mb-4">
            Create your first webinar, workshop, or seminar to start taking registrations.
          </p>
          <button
            onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); setCreateError(""); }}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700"
          >
            Create Your First Event
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const allowedTransitions = VALID_TRANSITIONS[event.status] ?? [];
            const isDraft = event.status === "draft";
            return (
              <div key={event.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{event.title}</h3>
                      <span
                        className={`shrink-0 text-[0.56rem] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[event.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {event.status}
                      </span>
                      <span className="shrink-0 text-[0.56rem] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
                        {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-slate-500 truncate mb-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[0.62rem] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <Icon name="calendar" size={11} />
                        {formatDateLocal(event.starts_at)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-0.5">
                          <Icon name="map-pin" size={11} />
                          {event.location}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Icon name="users" size={11} />
                        {event.rsvp_count} registered
                        {event.max_attendees != null && ` / ${event.max_attendees} capacity`}
                      </span>
                      <span>
                        {event.price_cents === 0 ? "Free" : `$${(event.price_cents / 100).toFixed(0)} AUD`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {allowedTransitions.map((t) => (
                      <button
                        key={t}
                        onClick={() => handleStatusChange(event, t)}
                        className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 capitalize"
                      >
                        {t === "published" ? "Publish" : t === "cancelled" ? "Cancel" : t === "completed" ? "Mark complete" : t}
                      </button>
                    ))}
                    {isDraft && (
                      <button
                        onClick={() => openEdit(event)}
                        className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                      >
                        Edit
                      </button>
                    )}
                    {isDraft && (
                      <button
                        onClick={() => { setDeletingId(event.id); setDeleteError(""); }}
                        className="text-xs px-2.5 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Shared form fields component ─────────────────────────────────────────────

interface EventFormFieldsProps {
  form: EventFormState;
  setField: (field: keyof EventFormState, value: string) => void;
}

function EventFormFields({ form, setField }: EventFormFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="org-evt-title" className="block text-xs font-semibold text-slate-600 mb-1">Title *</label>
        <input
          id="org-evt-title"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="e.g. SMSF Fundamentals Webinar"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label htmlFor="org-evt-description" className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
        <textarea
          id="org-evt-description"
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={3}
          placeholder="What will attendees learn or experience?"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="org-evt-type" className="block text-xs font-semibold text-slate-600 mb-1">Event type</label>
          <select
            id="org-evt-type"
            value={form.event_type}
            onChange={(e) => setField("event_type", e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="org-evt-price" className="block text-xs font-semibold text-slate-600 mb-1">Price (AUD)</label>
          <input
            id="org-evt-price"
            type="number"
            min="0"
            step="0.01"
            value={form.price_dollars}
            onChange={(e) => setField("price_dollars", e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="org-evt-starts-at" className="block text-xs font-semibold text-slate-600 mb-1">Starts at *</label>
          <input
            id="org-evt-starts-at"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setField("starts_at", e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label htmlFor="org-evt-ends-at" className="block text-xs font-semibold text-slate-600 mb-1">Ends at</label>
          <input
            id="org-evt-ends-at"
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setField("ends_at", e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="org-evt-location" className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
        <input
          id="org-evt-location"
          value={form.location}
          onChange={(e) => setField("location", e.target.value)}
          placeholder='e.g. "Online" or "123 Collins St, Melbourne VIC 3000"'
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label htmlFor="org-evt-meeting-url" className="block text-xs font-semibold text-slate-600 mb-1">Meeting URL (shown after registration)</label>
        <input
          id="org-evt-meeting-url"
          type="url"
          value={form.meeting_url}
          onChange={(e) => setField("meeting_url", e.target.value)}
          placeholder="https://zoom.us/j/..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label htmlFor="org-evt-capacity" className="block text-xs font-semibold text-slate-600 mb-1">Capacity (leave blank for unlimited)</label>
        <input
          id="org-evt-capacity"
          type="number"
          min="1"
          max="10000"
          value={form.max_attendees}
          onChange={(e) => setField("max_attendees", e.target.value)}
          placeholder="e.g. 100"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
    </div>
  );
}
