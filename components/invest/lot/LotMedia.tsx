import { listingEmbeds } from "@/lib/listings/listing-media";

/**
 * Video + virtual-tour embeds (idea #14). Renders only allowlisted,
 * re-built embed URLs (see lib/listings/listing-media.ts) — never a raw
 * seller-provided src. Lazy-loaded; hidden entirely when the listing has
 * no parseable media.
 */
export default function LotMedia({ km }: { km: Record<string, unknown> }) {
  const embeds = listingEmbeds(km);
  if (embeds.length === 0) return null;

  return (
    <div className="space-y-4">
      {embeds.map((embed) => (
        <div key={embed.embedUrl} className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={embed.embedUrl}
              title={embed.title}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share; xr-spatial-tracking"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {embed.kind === "youtube" ? "Video provided by the seller" : "3D tour provided by the seller"}
          </p>
        </div>
      ))}
    </div>
  );
}
