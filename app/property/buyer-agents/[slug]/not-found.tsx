import RouteNotFound from "@/components/RouteNotFound";

export default function BuyerAgentNotFound() {
  return (
    <RouteNotFound
      iconName="user-check"
      title="Buyer's Agent Not Found"
      description="We couldn't find that buyer's agent. They may have been renamed or removed."
      primaryCta={{ href: "/property/buyer-agents", label: "Browse Buyer's Agents" }}
      secondaryCta={{ href: "/property", label: "Property Hub" }}
    />
  );
}
