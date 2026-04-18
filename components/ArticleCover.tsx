import Image from "next/image";

interface ArticleCoverProps {
  /** Article title — used as image alt text and as the overlay
      label on category gradient fallbacks. */
  title: string;
  /** Optional real cover image URL. If present, rendered as the
      dominant layer. If missing or 404s at request time, the
      category gradient shows through. */
  coverImageUrl?: string | null;
  /** Article category slug — drives gradient colour + placeholder
      label. Unknown categories fall back to a neutral slate gradient. */
  category?: string | null;
  /** Render size — `detail` is the wide hero on /article/[slug],
      `card` is the smaller aspect-ratio thumbnail on the hub. */
  variant?: "detail" | "card";
  /** Whether the image is above-the-fold (used by next/image
      `priority` for LCP). Default false. */
  priority?: boolean;
  /** Override Next.js Image `sizes` attribute. */
  sizes?: string;
}

/**
 * Maps each known article category to a Tailwind gradient class
 * string. Keep in sync with CATEGORY_COLORS in app/articles/page.tsx.
 * The colours are softer tints of the category badge colours so the
 * covers feel family-related without shouting.
 */
const CATEGORY_GRADIENTS: Record<string, string> = {
  tax: "from-purple-100 via-purple-50 to-white",
  beginners: "from-blue-100 via-blue-50 to-white",
  smsf: "from-emerald-100 via-emerald-50 to-white",
  strategy: "from-amber-100 via-amber-50 to-white",
  news: "from-red-100 via-red-50 to-white",
  reviews: "from-teal-100 via-teal-50 to-white",
  crypto: "from-orange-100 via-orange-50 to-white",
  etfs: "from-indigo-100 via-indigo-50 to-white",
  "robo-advisors": "from-violet-100 via-violet-50 to-white",
  "research-tools": "from-cyan-100 via-cyan-50 to-white",
  super: "from-emerald-100 via-emerald-50 to-white",
  property: "from-lime-100 via-lime-50 to-white",
  "cfd-forex": "from-rose-100 via-rose-50 to-white",
};

const CATEGORY_LABELS: Record<string, string> = {
  tax: "Tax",
  beginners: "Beginners",
  smsf: "SMSF",
  strategy: "Strategy",
  news: "News",
  reviews: "Reviews",
  crypto: "Crypto",
  etfs: "ETFs",
  "robo-advisors": "Robo-Advisors",
  "research-tools": "Research Tools",
  super: "Super",
  property: "Property",
  "cfd-forex": "CFD & Forex",
};

const DEFAULT_GRADIENT = "from-amber-50 via-slate-50 to-emerald-50";

/**
 * Unified article cover renderer.
 *
 * When `coverImageUrl` is set, renders the real image with the
 * category gradient as a fallback behind it (so dead URLs don't
 * show a broken-image icon).
 *
 * When no cover is available, renders a gradient placeholder with
 * the category label overlaid — consistent with Medium / Substack
 * "no cover" treatment and far more polished than a blank card.
 */
export default function ArticleCover({
  title,
  coverImageUrl,
  category,
  variant = "card",
  priority = false,
  sizes,
}: ArticleCoverProps) {
  const gradient = (category && CATEGORY_GRADIENTS[category]) || DEFAULT_GRADIENT;
  const label = (category && CATEGORY_LABELS[category]) || null;

  const aspect =
    variant === "detail"
      ? "aspect-[2/1] md:aspect-[5/2]"
      : "aspect-[16/9]";
  const labelSize =
    variant === "detail" ? "text-3xl md:text-5xl" : "text-xl md:text-2xl";

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} ${aspect}`}
    >
      {coverImageUrl ? (
        <Image
          src={coverImageUrl}
          alt={title}
          fill
          sizes={sizes ?? "(max-width: 768px) 100vw, 800px"}
          className="object-cover"
          priority={priority}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center px-6 text-center"
          aria-hidden="true"
        >
          <div>
            {label && (
              <p className="text-[11px] md:text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                {label}
              </p>
            )}
            <p
              className={`${labelSize} font-extrabold text-slate-800/80 leading-tight max-w-md mx-auto line-clamp-3`}
            >
              {title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
