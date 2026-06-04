import RouteNotFound from "@/components/RouteNotFound";

export default function ForeignInvestmentJourneyNotFound() {
  return (
    <RouteNotFound
      iconName="globe"
      title="Country Not Found"
      description="We couldn't find an investment journey for that country. It may have been renamed or removed."
      primaryCta={{ href: "/foreign-investment", label: "Foreign Investment Hub" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
