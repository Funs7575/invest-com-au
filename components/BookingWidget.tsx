"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

type BookingSlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingWidget({ advisorSlug, advisorName }: { advisorSlug: string; advisorName: string }) {
  const [schedule, setSchedule] = useState<BookingSlot[]>([]);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [bookingIntro, setBookingIntro] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState("");
  const [existingBookings, setExistingBookings] = useState<string[]>([]);
  const [step, setStep] = useState<"calendar" | "form" | "confirmed">("calendar");
  const [form, setForm] = useState({ name: "", email: "", phone: "", topic: "" });
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/advisor-booking?advisor=${advisorSlug}`)
      .then(r => r.json())
      .then(data => {
        setBookingEnabled(data.bookingEnabled);
        setSchedule(data.schedule || []);
        setBookingIntro(data.advisor?.booking_intro || "");
        setBookingLink(data.advisor?.booking_link || "");
      })
      .catch(() => {});
  }, [advisorSlug]);

  // Generate next 14 days of available dates
  const availableDates = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(Date.now() + i * 86400000);
    const dow = d.getDay();
    const hasSlots = schedule.some(s => s.day_of_week === dow);
    if (hasSlots) {
      availableDates.push({
        date: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }),
        dow,
      });
    }
  }

  // Load booked times when date changes
  useEffect(() => {
    if (!selectedDate) return;
    fetch(`/api/advisor-booking?advisor=${advisorSlug}&date=${selectedDate}`)
      .then(r => r.json())
      .then(data => setExistingBookings(data.existingBookings || []))
      .catch(() => {});
  }, [selectedDate, advisorSlug]);

  // Generate time slots for selected date
  const getTimeSlotsForDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dow = d.getDay();
    const daySlots = schedule.filter(s => s.day_of_week === dow);
    const times: string[] = [];
    for (const slot of daySlots) {
      const [startH, startM] = slot.start_time.split(":").map(Number);
      const [endH, endM] = slot.end_time.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const dur = slot.slot_duration_minutes || 30;
      for (let m = startMinutes; m + dur <= endMinutes; m += dur) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const timeStr = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:00`;
        if (!existingBookings.includes(timeStr)) {
          times.push(timeStr);
        }
      }
    }
    return times;
  };

  const timeSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : [];

  const formatTime = (t: string) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  };

  const submitBooking = async () => {
    if (!form.name || !form.email || !selectedDate || !selectedTime) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setBookingError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setBookingError(null);
    try {
      const res = await fetch("/api/advisor-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisorSlug,
          investorName: form.name,
          investorEmail: form.email,
          investorPhone: form.phone,
          bookingDate: selectedDate,
          bookingTime: selectedTime,
          topic: form.topic,
          sourcePage: window.location.pathname,
        }),
      });
      if (res.ok) setStep("confirmed");
      else setBookingError("This slot may no longer be available. Please try another time.");
    } catch {
      setBookingError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  if (!bookingEnabled) {
    // External booking link (Calendly, Cal.com, etc.)
    if (bookingLink) {
      return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Icon name="calendar" size={18} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Book a Free Consultation</h3>
                <p className="text-[0.6rem] text-amber-600">30-minute video or phone call</p>
              </div>
            </div>
            {bookingIntro && <p className="text-xs text-slate-600 mb-3">{bookingIntro}</p>}
            <a
              href={bookingLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // Track booking click as high-value conversion event
                fetch("/api/track-event", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "booking_click",
                    page: `/advisor/${advisorSlug}`,
                    metadata: { advisor: advisorSlug, booking_url: bookingLink },
                  }),
                }).catch(() => {});
              }}
              className="block w-full text-center px-4 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm shadow-sm hover:shadow-md"
            >
              Choose a Time &rarr;
            </a>
            <p className="text-[0.5rem] text-amber-400 text-center mt-2">
              {bookingLink.includes("calendly") ? "Powered by Calendly" : bookingLink.includes("cal.com") ? "Powered by Cal.com" : "Opens booking calendar"} &middot; No obligation &middot; Free initial consultation
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  // ─── CONFIRMED ───
  if (step === "confirmed") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
        <Icon name="check-circle" size={32} className="text-emerald-600 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-emerald-900 mb-1">Booking Confirmed!</h3>
        <p className="text-sm text-emerald-700 mb-2">
          {new Date(selectedDate).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })} at {formatTime(selectedTime)} AEST
        </p>
        <p className="text-xs text-emerald-600">
          {advisorName} will contact you to confirm the meeting details. Check your email for a confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Icon name="calendar" size={18} className="text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900">Book a Consultation</h3>
        </div>
        {bookingIntro && <p className="text-xs text-slate-500 mt-0.5">{bookingIntro}</p>}
      </div>

      <div className="p-4">
        {step === "calendar" && (
          <>
            {/* Date picker */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-2">Select a Date</label>
              <div className="flex flex-wrap gap-1.5">
                {availableDates.slice(0, 7).map((d) => (
                  <button
                    key={d.date}
                    onClick={() => { setSelectedDate(d.date); setSelectedTime(""); }}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                      selectedDate === d.date
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time picker */}
            {selectedDate && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-2">Select a Time (AEST)</label>
                {timeSlots.length === 0 ? (
                  <p className="text-xs text-slate-500">No available slots on this date.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {timeSlots.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                          selectedTime === t
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {formatTime(t)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTime && (
              <button
                onClick={() => setStep("form")}
                className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 transition-colors"
              >
                Continue →
              </button>
            )}
          </>
        )}

        {step === "form" && (
          <>
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <div className="text-xs font-semibold text-slate-700">
                {new Date(selectedDate).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })} at {formatTime(selectedTime)} AEST
              </div>
              <button onClick={() => setStep("calendar")} className="text-[0.62rem] text-slate-500 hover:text-slate-700">Change →</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="jane@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone (optional)</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="04XX XXX XXX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">What would you like to discuss?</label>
                <textarea value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. SMSF setup, retirement planning..." />
              </div>
              {bookingError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{bookingError}</p>
              )}
              <button
                onClick={submitBooking}
                disabled={submitting || !form.name || !form.email}
                className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
            <p className="text-[0.56rem] text-slate-400 mt-2 text-center">
              By booking, you agree to share your details with {advisorName}. <a href="/privacy" className="underline">Privacy Policy</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
