import { createFileRoute } from "@tanstack/react-router";
import { callGroqAssistant } from "@/lib/groq-assistant.server";

export const Route = createFileRoute("/api/groq-assistant")({
  server: {
    handlers: {
      POST: ({ request }) => callGroqAssistant(request),
    },
  },
});
