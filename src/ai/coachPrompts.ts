import type { CoachContext, CoachPrompts } from "./types";

// Prompt construction for *real* LLM providers. The MockCoachProvider does not
// use these — they exist so a future OpenAI/Anthropic/local/back-end provider
// can be dropped in without rethinking the guardrails.

export const COACH_SYSTEM_PROMPT = `You are a concise strength-training coach embedded in a personal gym tracker.

Hard rules:
- You are given a structured JSON "coach context" produced by a deterministic training engine. Treat every number in it as ground truth.
- NEVER invent or alter weights, reps, sets, or volume. Only reference numbers present in the context.
- Do not prescribe new numbers. If you mention what to do next, restate the engine's "suggestion" fields verbatim in plain language.
- Be specific, encouraging, and brief. No medical or injury diagnosis — if a fatigue or pain flag is present, frame it as a cue to adjust.
- Output JSON only, matching the requested schema.`;

// A compact, deterministic projection of the context for the prompt body.
function contextDigest(ctx: CoachContext): string {
  const lines: string[] = [];
  lines.push(`Workout: ${ctx.workoutName} (${ctx.date})`);
  lines.push(
    `Session totals: ${ctx.totals.workingSets} working sets, ${ctx.totals.totalReps} reps, ${ctx.totals.totalVolume} ${ctx.unit}-volume` +
      (ctx.totals.durationMin ? `, ${ctx.totals.durationMin} min` : "")
  );
  for (const e of ctx.exercises) {
    const prev = e.previous
      ? ` (prev vol ${e.previous.totalVolume}, top ${e.previous.topWeight})`
      : " (first time)";
    lines.push(
      `- ${e.name} [${e.trend}]: ${e.today.workingSets}x, ${e.today.totalReps} reps, top ${e.today.topWeight} ${ctx.unit}, vol ${e.today.totalVolume}${prev}. Next: ${e.suggestion.action} — ${e.suggestion.detail}`
    );
  }
  if (ctx.weeklyVolume.length) {
    const vol = ctx.weeklyVolume
      .map((v) => `${v.muscle} ${v.hardSets}${v.min != null ? `/${v.min}-${v.max}` : ""} (${v.status})`)
      .join("; ");
    lines.push(`Weekly hard sets: ${vol}`);
  }
  if (ctx.bodyweight) {
    lines.push(
      `Bodyweight: ${ctx.bodyweight.latest} ${ctx.bodyweight.unit}` +
        (ctx.bodyweight.deltaFromPrevious != null
          ? ` (${ctx.bodyweight.deltaFromPrevious >= 0 ? "+" : ""}${ctx.bodyweight.deltaFromPrevious} vs prev)`
          : "")
    );
  }
  if (ctx.readiness) {
    lines.push(
      `Readiness: ${["sleep", "energy", "soreness", "stress"]
        .map((k) => {
          const v = (ctx.readiness as Record<string, number | undefined>)[k];
          return v != null ? `${k} ${v}/5` : null;
        })
        .filter(Boolean)
        .join(", ")}`
    );
  }
  if (ctx.flags.length) {
    lines.push(`Flags: ${ctx.flags.map((f) => f.message).join(" | ")}`);
  }
  return lines.join("\n");
}

export function buildCoachPrompts(ctx: CoachContext): CoachPrompts {
  const user = `Here is the deterministic coach context for the workout I just finished.

${contextDigest(ctx)}

Full structured context (authoritative):
${JSON.stringify(ctx)}

Write a short coach summary. Respond as JSON:
{
  "headline": "one upbeat sentence",
  "summary": "1-3 short paragraphs explaining how the session went and what the engine suggests next",
  "bullets": ["3-5 concrete takeaways, each restating an engine fact or suggestion"]
}`;

  return { system: COACH_SYSTEM_PROMPT, user };
}
