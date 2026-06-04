import RouteNotFound from "@/components/RouteNotFound";

export default function AccountPlanNotFound() {
  return (
    <RouteNotFound
      iconName="clipboard-list"
      title="Plan Not Found"
      description="We couldn't find that plan, or it doesn't belong to your account."
      primaryCta={{ href: "/account/plans", label: "Your Plans" }}
      secondaryCta={{ href: "/account", label: "Account Home" }}
    />
  );
}
