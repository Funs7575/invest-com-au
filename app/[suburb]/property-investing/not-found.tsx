import RouteNotFound from "@/components/RouteNotFound";

export default function SuburbPropertyInvestingNotFound() {
  return (
    <RouteNotFound
      iconName="home"
      title="Suburb Not Found"
      description="We couldn't find a property-investing guide for that suburb. It may have been renamed or removed."
      primaryCta={{ href: "/", label: "Go Home" }}
      secondaryCta={{ href: "/property", label: "Property Hub" }}
    />
  );
}
