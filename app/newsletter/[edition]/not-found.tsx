import RouteNotFound from "@/components/RouteNotFound";

export default function NewsletterEditionNotFound() {
  return (
    <RouteNotFound
      iconName="mail"
      title="Edition Not Found"
      description="We couldn't find that newsletter edition. It may have been renamed or removed."
      primaryCta={{ href: "/newsletter", label: "Newsletter Archive" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
