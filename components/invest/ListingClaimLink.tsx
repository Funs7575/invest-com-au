"use client";

/**
 * "Claim this listing" link for unclaimed funds / physical-assets /
 * project-equity rows. Lives inside the parent <Link> card; stops
 * propagation so clicking it routes to the claim flow instead of the
 * listing detail page.
 */

export default function ListingClaimLink({
  slug,
  label,
}: {
  slug: string;
  label: string;
}) {
  const href = `/listings/claim?target=${encodeURIComponent(slug)}`;

  return (
    <p className="mt-2 text-[0.6rem] text-slate-400">
      Are you the {label}?{" "}
      <span
        role="link"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = href;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = href;
          }
        }}
        className="text-amber-700 font-semibold underline-offset-2 hover:underline cursor-pointer"
      >
        Claim this listing
      </span>
    </p>
  );
}
