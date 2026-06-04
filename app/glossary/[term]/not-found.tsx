import RouteNotFound from "@/components/RouteNotFound";

export default function GlossaryTermNotFound() {
  return (
    <RouteNotFound
      iconName="book-open"
      title="Term Not Found"
      description="We couldn't find that glossary term. It may have been renamed or removed."
      primaryCta={{ href: "/glossary", label: "Browse Glossary" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
