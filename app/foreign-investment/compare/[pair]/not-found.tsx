import RouteNotFound from "@/components/RouteNotFound";

export default function ForeignInvestmentPairNotFound() {
  return (
    <RouteNotFound
      iconName="globe"
      title="Comparison Not Found"
      description="We couldn't find that country comparison. One or more countries may have been renamed or removed."
      primaryCta={{ href: "/foreign-investment", label: "Foreign Investment Hub" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
