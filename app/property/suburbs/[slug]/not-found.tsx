import RouteNotFound from "@/components/RouteNotFound";

export default function SuburbProfileNotFound() {
  return (
    <RouteNotFound
      iconName="map-pin"
      title="Suburb Not Found"
      description="We couldn't find that suburb profile. It may have been renamed or removed."
      primaryCta={{ href: "/property/suburbs", label: "Browse Suburbs" }}
      secondaryCta={{ href: "/property", label: "Property Hub" }}
    />
  );
}
