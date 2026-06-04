import RouteNotFound from "@/components/RouteNotFound";

export default function PropertyListingNotFound() {
  return (
    <RouteNotFound
      iconName="home"
      title="Listing Not Found"
      description="We couldn't find that property listing. It may have been sold or removed."
      primaryCta={{ href: "/property/listings", label: "Browse Listings" }}
      secondaryCta={{ href: "/property", label: "Property Hub" }}
    />
  );
}
