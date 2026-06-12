import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/seo";
import {
  getBookingByRescheduleToken,
  isBookingV2Enabled,
  listWeeklyTemplate,
} from "@/lib/booking-v2";
import { bookingStartUtc, formatBookingForHumans } from "@/lib/booking-v2/time";
import type { BookingSlotTemplateRow } from "@/lib/booking-v2/types";
// eslint-disable-next-line no-restricted-imports -- need the advisor's display name for a PII-table booking; professionals name beyond active-status reads is fetched server-side here.
import { createAdminClient } from "@/lib/supabase/admin";
import ManageBookingClient from "./ManageBookingClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage your booking — Invest.com.au",
  description: "Reschedule or cancel your consultation.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/booking` },
};

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Fail-closed: if scheduling-v2 is off, these links don't resolve.
  if (!(await isBookingV2Enabled())) notFound();

  const booking = await getBookingByRescheduleToken(token);
  if (!booking) notFound();

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("name, slug")
    .eq("id", booking.professional_id)
    .maybeSingle();

  const tz = booking.booking_tz ?? "Australia/Sydney";
  const startUtc = booking.starts_at_utc
    ? new Date(booking.starts_at_utc)
    : bookingStartUtc(booking.booking_date, booking.booking_time, tz);
  const when = formatBookingForHumans(startUtc, tz);

  const template: BookingSlotTemplateRow[] = await listWeeklyTemplate(
    booking.professional_id,
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-16">
        <p className="text-amber-600 text-[11px] font-bold uppercase tracking-widest mb-2">
          Your booking
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          Manage your consultation
        </h1>
        <ManageBookingClient
          token={token}
          advisorName={(pro?.name as string) ?? "your adviser"}
          when={when}
          timeZone={tz}
          status={booking.status}
          template={template.map((r) => ({
            dayOfWeek: r.day_of_week,
            startTime: r.start_time,
            endTime: r.end_time,
            slotDurationMinutes: r.slot_duration_minutes ?? 30,
            isActive: r.is_active ?? true,
          }))}
        />
      </div>
    </div>
  );
}
