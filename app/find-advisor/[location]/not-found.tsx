import RouteNotFound from "@/components/RouteNotFound";

export default function FindAdvisorLocationNotFound() {
  return (
    <RouteNotFound
      iconName="map-pin"
      title="Location Not Found"
      description="We couldn't find advisors for that location. It may have been renamed or removed."
      primaryCta={{ href: "/find-advisor", label: "Find an Advisor" }}
      secondaryCta={{ href: "/advisors", label: "Browse Advisors" }}
    />
  );
}
