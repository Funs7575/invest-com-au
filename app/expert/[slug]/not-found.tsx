import RouteNotFound from "@/components/RouteNotFound";

export default function ExpertNotFound() {
  return (
    <RouteNotFound
      iconName="user-check"
      title="Expert Not Found"
      description="We couldn't find that expert profile. They may have been renamed or removed."
      primaryCta={{ href: "/advisors", label: "Browse Advisors" }}
      secondaryCta={{ href: "/find-advisor", label: "Find an Advisor" }}
    />
  );
}
