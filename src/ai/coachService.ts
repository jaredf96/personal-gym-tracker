import { db } from "../db/db";
import { getSettings } from "../db/repo";
import { uid } from "../lib/id";
import { buildCoachContext } from "./coachContext";
import { buildCoachPrompts } from "./coachPrompts";
import { MockCoachProvider } from "./providers/MockCoachProvider";
import type { AiReport } from "../types";
import type { CoachContext, CoachProvider, CoachReport } from "./types";

// ---------------------------------------------------------------------------
// Provider registry.
//
// Today only the mock provider exists. To add a real one:
//   1. Implement CoachProvider (see providers/CoachProvider.ts) that POSTs the
//      prompts to YOUR backend/serverless endpoint (which holds the API key).
//   2. Register it here under a key.
//   3. Set settings.coachProvider to that key.
// NEVER ship an LLM API key in this frontend bundle.
// ---------------------------------------------------------------------------
const providers: Record<string, CoachProvider> = {
  mock: new MockCoachProvider(),
  // anthropic: new AnthropicCoachProvider(),   // TODO: backend-routed
  // openai:    new OpenAICoachProvider(),      // TODO: backend-routed
  // local:     new LocalLlmCoachProvider(),    // TODO: e.g. Ollama on localhost
};

function resolveProvider(name: string): CoachProvider {
  return providers[name] ?? providers.mock;
}

export interface CoachResult {
  report: CoachReport;
  context: CoachContext;
  reportId: string;
}

// Generates a coach summary for a finished session and persists it as an
// AiReport. The deterministic engine builds the facts; the provider only writes
// the prose. Returns null if the session has no analyzable data.
export async function generateCoachSummary(sessionId: string): Promise<CoachResult | null> {
  const context = await buildCoachContext(sessionId);
  if (!context) return null;

  const settings = await getSettings();
  const provider = resolveProvider(settings.coachProvider);
  const prompts = buildCoachPrompts(context);

  const report = await provider.generateSummary(context, prompts);

  const stored: AiReport = {
    id: uid("ai"),
    sessionId,
    createdAt: new Date().toISOString(),
    provider: report.provider,
    headline: report.headline,
    summary: report.summary,
    bullets: report.bullets,
  };
  await db.aiReports.put(stored);

  return { report, context, reportId: stored.id };
}

export async function getLatestReportForSession(sessionId: string): Promise<AiReport | null> {
  const reports = await db.aiReports.where("sessionId").equals(sessionId).toArray();
  reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return reports[0] ?? null;
}

export function availableProviders(): string[] {
  return Object.keys(providers);
}
