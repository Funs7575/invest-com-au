import RouteNotFound from "@/components/RouteNotFound";

export default function AfslNotFound() {
  return (
    <RouteNotFound
      iconName="shield-check"
      title="AFSL Not Found"
      description="We couldn't find a record for that AFSL number. It may have been cancelled or entered incorrectly."
      primaryCta={{ href: "/afsl", label: "AFSL Lookup" }}
      secondaryCta={{ href: "/find-advisor", label: "Find an Advisor" }}
    />
  );
}
