import RouteNotFound from "@/components/RouteNotFound";

export default function FullServiceBrokerNotFound() {
  return (
    <RouteNotFound
      iconName="briefcase"
      title="Broker Not Found"
      description="We couldn't find that full-service broker. They may have been renamed or removed."
      primaryCta={{ href: "/brokers", label: "Compare Brokers" }}
      secondaryCta={{ href: "/best", label: "Best-Of Rankings" }}
    />
  );
}
