import RouteNotFound from "@/components/RouteNotFound";

export default function ConsultationNotFound() {
  return (
    <RouteNotFound
      iconName="message-circle"
      title="Consultation Not Found"
      description="We couldn't find that consultation. It may have been renamed or removed."
      primaryCta={{ href: "/advisors", label: "Browse Advisors" }}
      secondaryCta={{ href: "/find-advisor", label: "Find an Advisor" }}
    />
  );
}
