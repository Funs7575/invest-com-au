import RouteNotFound from "@/components/RouteNotFound";

export default function AlertNotFound() {
  return (
    <RouteNotFound
      iconName="bell"
      title="Alert Not Found"
      description="We couldn't find that alert. It may have been renamed or removed."
      primaryCta={{ href: "/alerts", label: "Browse Alerts" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
