import RouteNotFound from "@/components/RouteNotFound";

export default function QuestionNotFound() {
  return (
    <RouteNotFound
      iconName="help-circle"
      title="Question Not Found"
      description="We couldn't find that question. It may have been removed."
      primaryCta={{ href: "/questions", label: "Browse Questions" }}
      secondaryCta={{ href: "/articles", label: "Read Articles" }}
    />
  );
}
