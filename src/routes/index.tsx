import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CGS" },
      { name: "description", content: "CGS" },
      { property: "og:title", content: "CGS" },
      { property: "og:description", content: "CGS" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <main className="min-h-screen bg-background" aria-label="CGS" />;
}
