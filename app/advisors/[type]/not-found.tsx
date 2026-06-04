import RouteNotFound from "@/components/RouteNotFound";

export default function AdvisorTypeNotFound() {
  return (
    <RouteNotFound
      iconName="users"
      title="Advisor Category Not Found"
      description="We couldn't find that advisor category. It may have been renamed or removed."
      primaryCta={{ href: "/advisors", label: "Browse Advisors" }}
      secondaryCta={{ href: "/find-advisor", label: "Find an Advisor" }}
    />
  );
}
