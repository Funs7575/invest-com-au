import RouteNotFound from "@/components/RouteNotFound";

export default function FirmNotFound() {
  return (
    <RouteNotFound
      iconName="building"
      title="Firm Not Found"
      description="We couldn't find that advice firm. They may have been renamed or removed."
      primaryCta={{ href: "/find-advisor", label: "Find an Advisor" }}
      secondaryCta={{ href: "/advisors", label: "Browse Advisors" }}
    />
  );
}
