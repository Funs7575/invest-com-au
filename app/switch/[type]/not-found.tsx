import RouteNotFound from "@/components/RouteNotFound";

export default function SwitchTypeNotFound() {
  return (
    <RouteNotFound
      iconName="arrow-left-right"
      title="Switch Guide Not Found"
      description="We couldn't find that switch guide. It may have been renamed or removed."
      primaryCta={{ href: "/switch", label: "Switch Brokers" }}
      secondaryCta={{ href: "/brokers", label: "Compare Brokers" }}
    />
  );
}
