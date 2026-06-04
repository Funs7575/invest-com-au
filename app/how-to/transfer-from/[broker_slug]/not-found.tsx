import RouteNotFound from "@/components/RouteNotFound";

export default function TransferFromNotFound() {
  return (
    <RouteNotFound
      iconName="arrow-left-right"
      title="Broker Not Found"
      description="We couldn't find a transfer guide for that broker. They may have been renamed or removed."
      primaryCta={{ href: "/switch", label: "Switch Brokers" }}
      secondaryCta={{ href: "/brokers", label: "Compare Brokers" }}
    />
  );
}
