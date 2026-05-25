/**
 * Enhanced (paid) firm-profile components — B2 branded-profile tier.
 *
 * Server-safe (no hooks). Rendered on /firm/[slug] ONLY when the firm has
 * an active branded-profile entitlement (advisor_firms.branded_profile_active).
 * Free firms never render this — the gate lives in the page, and each
 * sub-component also no-ops when its own content field is empty, so a firm
 * that subscribes but hasn't filled in (say) a booking link simply doesn't
 * show that block.
 *
 * Content fields come from the advisor_firms migration
 * (20260521000000_firm_branded_profile_subscription.sql): hero_tagline,
 * hero_image_url, featured_specialties[], booking_embed_url.
 */

import Image from "next/image";
import Icon from "@/components/Icon";

/**
 * Only allow embedding a booking iframe from an absolute https URL. Anything
 * else (relative, javascript:, http) is rejected — we render a plain link
 * instead of an iframe so a misconfigured/hostile URL can't run in our
 * origin. Defence-in-depth on top of the sandbox attribute.
 */
function safeEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function BrandedHero({
  firmName,
  tagline,
  imageUrl,
}: {
  firmName: string;
  tagline?: string | null;
  imageUrl?: string | null;
}) {
  // Nothing custom to show → render nothing (page keeps its default header).
  if (!tagline && !imageUrl) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      {imageUrl ? (
        <div className="relative h-40 sm:h-56 w-full">
          <Image
            src={imageUrl}
            alt={`${firmName} hero`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
          {tagline && (
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <p className="text-lg sm:text-2xl font-bold text-white drop-shadow-sm max-w-3xl">
                {tagline}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-violet-600 to-violet-500 p-6 sm:p-8">
          <p className="text-lg sm:text-2xl font-bold text-white max-w-3xl">
            {tagline}
          </p>
        </div>
      )}
    </div>
  );
}

export function FeaturedSpecialties({
  specialties,
}: {
  specialties?: string[] | null;
}) {
  const items = (specialties ?? []).filter((s) => s && s.trim().length > 0);
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-violet-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Icon name="check-circle" size={16} className="text-violet-600" />
        Featured Specialties
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <span
            key={s}
            className="px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg border border-violet-200"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BookingEmbed({
  firmName,
  embedUrl,
}: {
  firmName: string;
  embedUrl?: string | null;
}) {
  const safe = safeEmbedUrl(embedUrl);
  if (!safe) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Icon name="credit-card" size={16} className="text-violet-600" />
        Book a Consultation
      </h2>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <iframe
          src={safe}
          title={`Book with ${firmName}`}
          className="w-full h-[520px]"
          loading="lazy"
          // Locked-down sandbox: allow the booking widget to run + submit
          // forms + open its confirmation, but deny same-origin access to
          // our cookies/storage. Defence-in-depth with safeEmbedUrl().
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
        />
      </div>
      <p className="mt-2 text-[0.65rem] text-slate-400">
        Booking is handled by {firmName}&apos;s scheduling provider.{" "}
        <a
          href={safe}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-violet-600 hover:text-violet-700 inline-flex items-center gap-0.5"
        >
          Open in a new tab
          <Icon name="external-link" size={11} />
        </a>
      </p>
    </div>
  );
}
