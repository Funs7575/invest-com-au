import RouteNotFound from "@/components/RouteNotFound";

export default function InvestingForOccupationNotFound() {
  return (
    <RouteNotFound
      iconName="briefcase"
      title="Guide Not Found"
      description="We couldn't find an investing guide for that occupation. It may have been renamed or removed."
      primaryCta={{ href: "/", label: "Go Home" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
