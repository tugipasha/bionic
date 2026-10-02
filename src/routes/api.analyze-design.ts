import { createFileRoute } from "@tanstack/react-router";

import { analyzeDesignRequest } from "@/lib/design-analysis.server";

export const Route = createFileRoute("/api/analyze-design")({
  server: {
    handlers: {
      POST: ({ request }) => analyzeDesignRequest(request),
    },
  },
});
