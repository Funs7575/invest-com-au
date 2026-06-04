import RouteNotFound from "@/components/RouteNotFound";

export default function AdvisorJobNotFound() {
  return (
    <RouteNotFound
      iconName="briefcase"
      title="Job Not Found"
      description="We couldn't find that job listing. It may have been filled or removed."
      primaryCta={{ href: "/advisor-jobs", label: "Browse Jobs" }}
      secondaryCta={{ href: "/advisors", label: "Browse Advisors" }}
    />
  );
}
