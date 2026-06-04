import RouteNotFound from "@/components/RouteNotFound";

export default function ReportNotFound() {
  return (
    <RouteNotFound
      iconName="file-text"
      title="Report Not Found"
      description="We couldn't find that report. It may have been renamed or removed."
      primaryCta={{ href: "/reports", label: "Browse Reports" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
