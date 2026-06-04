import RouteNotFound from "@/components/RouteNotFound";

export default function OfficeHoursNotFound() {
  return (
    <RouteNotFound
      iconName="clock"
      title="Session Not Found"
      description="We couldn't find that office-hours session. It may have ended or been removed."
      primaryCta={{ href: "/office-hours", label: "Browse Office Hours" }}
      secondaryCta={{ href: "/advisors", label: "Browse Advisors" }}
    />
  );
}
