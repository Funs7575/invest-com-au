import RouteNotFound from "@/components/RouteNotFound";

export default function EventNotFound() {
  return (
    <RouteNotFound
      iconName="calendar"
      title="Event Not Found"
      description="We couldn't find that event. It may have ended or been removed."
      primaryCta={{ href: "/events", label: "Browse Events" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
