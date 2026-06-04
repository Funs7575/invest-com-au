import RouteNotFound from "@/components/RouteNotFound";

export default function BestForNotFound() {
  return (
    <RouteNotFound
      iconName="award"
      title="Page Not Found"
      description="We couldn't find that best-for guide. It may have been renamed or removed."
      primaryCta={{ href: "/best", label: "Best-Of Rankings" }}
      secondaryCta={{ href: "/brokers", label: "Compare Brokers" }}
    />
  );
}
