import RouteNotFound from "@/components/RouteNotFound";

export default function SwitchScriptNotFound() {
  return (
    <RouteNotFound
      iconName="file-text"
      title="Script Not Found"
      description="We couldn't find a switch script for that broker. They may have been renamed or removed."
      primaryCta={{ href: "/switch", label: "Switch Brokers" }}
      secondaryCta={{ href: "/brokers", label: "Compare Brokers" }}
    />
  );
}
