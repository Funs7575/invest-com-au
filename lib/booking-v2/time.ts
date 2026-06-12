/**
 * Time / timezone helpers for booking-v2 — dependency-free.
 *
 * Bookings are stored as a wall-clock pair (booking_date + booking_time) in a
 * named IANA zone (booking_tz, default Australia/Sydney). For reminders and ICS
 * we need the precise UTC instant. Converting a wall-clock time in a named zone
 * to UTC without a tz library is done with the standard `Intl` offset trick:
 * format the candidate instant *in the target zone*, read back the components,
 * and correct by the difference. One correction pass is exact for all but the
 * DST-transition hour; a second pass converges those too.
 */

/**
 * Given a local wall-clock datetime ("YYYY-MM-DDTHH:mm[:ss]") that is meant to
 * be read in `timeZone`, return the UTC Date for that instant.
 *
 * Throws on an unparseable input. DST-ambiguous/skipped local times resolve to
 * the offset Intl reports for the computed instant (deterministic, matches how
 * calendar apps coerce them).
 */
export function zonedWallClockToUtc(local: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    local,
  );
  if (!m) throw new Error(`zonedWallClockToUtc: invalid datetime "${local}"`);
  const [, y, mo, d, h, mi, s] = m;
  const Y = Number(y);
  const Mo = Number(mo);
  const D = Number(d);
  const H = Number(h);
  const Mi = Number(mi);
  const S = s ? Number(s) : 0;

  // Target wall-clock expressed as if it were UTC (a reference value).
  const asUtcMs = Date.UTC(Y, Mo - 1, D, H, Mi, S);

  // Offset (zone − UTC) at a candidate instant, then correct. Two passes handle
  // the DST boundary hour where the first correction lands on the other side.
  let instant = asUtcMs;
  for (let i = 0; i < 2; i++) {
    const offsetMs = zoneOffsetMs(new Date(instant), timeZone);
    const corrected = asUtcMs - offsetMs;
    if (corrected === instant) break;
    instant = corrected;
  }
  return new Date(instant);
}

/**
 * The offset of `timeZone` from UTC at a given instant, in milliseconds
 * (zoneLocal − UTC). Positive east of UTC (e.g. Australia/Sydney ≈ +10/+11h).
 */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Reconstruct the zone-local wall clock as if it were UTC, then subtract the
  // true instant to get the offset.
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

/**
 * Compose a booking's stored date + time + zone into a UTC Date.
 * `bookingTime` may be "HH:MM" or "HH:MM:SS".
 */
export function bookingStartUtc(
  bookingDate: string,
  bookingTime: string,
  timeZone: string,
): Date {
  const time = /^\d{2}:\d{2}$/.test(bookingTime)
    ? `${bookingTime}:00`
    : bookingTime;
  return zonedWallClockToUtc(`${bookingDate}T${time}`, timeZone);
}

/** Add minutes to a Date, returning a new Date. */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * The local wall-clock string ("YYYY-MM-DDTHH:mm:ss") for an instant in a zone —
 * used to feed the ICS builder's TZID form. Inverse-ish of zonedWallClockToUtc.
 */
export function utcToZonedWallClock(instant: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get(
    "minute",
  )}:${get("second")}`;
}

/** Human-friendly date+time in a zone, e.g. "Friday, 12 June 2026 at 2:00 PM". */
export function formatBookingForHumans(
  instant: Date,
  timeZone: string,
): string {
  const date = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(instant);
  const time = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(instant);
  return `${date} at ${time}`;
}
