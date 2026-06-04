import RouteNotFound from "@/components/RouteNotFound";

export default function TeamNotFound() {
  return (
    <RouteNotFound
      iconName="users"
      title="Team Not Found"
      description="We couldn't find that team. They may have been renamed or removed."
      primaryCta={{ href: "/teams", label: "Browse Teams" }}
      secondaryCta={{ href: "/find-advisor", label: "Find an Advisor" }}
    />
  );
}
