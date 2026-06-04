import RouteNotFound from "@/components/RouteNotFound";

export default function ForeignInvestmentCountryNotFound() {
  return (
    <RouteNotFound
      iconName="globe"
      title="Country Not Found"
      description="We couldn't find a foreign-investment guide for that country. It may have been renamed or removed."
      primaryCta={{ href: "/foreign-investment", label: "Foreign Investment Hub" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
