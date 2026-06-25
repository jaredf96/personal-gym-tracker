// Re-export of the provider contract so all providers import from one place.
//
// To add a real provider, implement `CoachProvider`:
//
//   export class AnthropicCoachProvider implements CoachProvider {
//     readonly name = "anthropic";
//     async generateSummary(ctx, prompts) {
//       // TODO: call YOUR backend endpoint, not the LLM directly.
//       //   const res = await fetch("/api/coach", {
//       //     method: "POST",
//       //     headers: { "content-type": "application/json" },
//       //     body: JSON.stringify({ system: prompts.system, user: prompts.user }),
//       //   });
//       // The backend holds the API key and calls Anthropic/OpenAI/etc.
//       // NEVER put an API key in this frontend bundle.
//     }
//   }
//
// Then register it in coachService.ts.
export type { CoachProvider, CoachContext, CoachReport, CoachPrompts } from "../types";
