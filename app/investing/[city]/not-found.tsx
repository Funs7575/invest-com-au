import RouteNotFound from "@/components/RouteNotFound";

export default function InvestingCityNotFound() {
  return (
    <RouteNotFound
      iconName="map-pin"
      title="City Not Found"
      description="We couldn't find an investing guide for that city. It may have been renamed or removed."
      primaryCta={{ href: "/", label: "Go Home" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
