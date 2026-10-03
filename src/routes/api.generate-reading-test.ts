import { createFileRoute } from "@tanstack/react-router";
import { generateReadingTestTexts } from "@/lib/generate-test-texts.server";

export const Route = createFileRoute("/api/generate-reading-test")({
  server: {
    handlers: {
      POST: ({ request }) => generateReadingTestTexts(request),
    },
  },
});
