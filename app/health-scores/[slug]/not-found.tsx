import RouteNotFound from "@/components/RouteNotFound";

export default function HealthScoreNotFound() {
  return (
    <RouteNotFound
      iconName="activity"
      title="Health Score Not Found"
      description="We couldn't find that health score. It may have been renamed or removed."
      primaryCta={{ href: "/health-scores", label: "Browse Health Scores" }}
      secondaryCta={{ href: "/", label: "Go Home" }}
    />
  );
}
