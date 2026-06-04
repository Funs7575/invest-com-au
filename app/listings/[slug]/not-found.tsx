import RouteNotFound from "@/components/RouteNotFound";

export default function ListingNotFound() {
  return (
    <RouteNotFound
      iconName="store"
      title="Listing Not Found"
      description="We couldn't find that listing. It may have been renamed or removed."
      primaryCta={{ href: "/listings", label: "Browse Listings" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
