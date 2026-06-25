import type { CoachContext, CoachProvider, CoachReport, CoachPrompts } from "../types";

// Deterministic stand-in for a real LLM. It writes a realistic summary purely
// from the engine-provided `CoachContext` — it does NOT invent any numbers.
// Swap this out for a backend-routed provider later (see CoachProvider.ts).
export class MockCoachProvider implements CoachProvider {
  readonly name = "mock";

  // `_prompts` is unused here; a real provider would send them to a backend.
  async generateSummary(ctx: CoachContext, _prompts: CoachPrompts): Promise<CoachReport> {
    // Simulate a tiny bit of latency so the UI loading state is visible.
    await new Promise((r) => setTimeout(r, 350));

    const u = ctx.unit;
    const up = ctx.improvements.length;
    const down = ctx.regressions.length;
    const matched = ctx.exercises.filter((e) => e.trend === "matched").length;

    const headline = buildHeadline(ctx, up, down);

    const paras: string[] = [];
    paras.push(
      `You logged ${ctx.totals.workingSets} working sets across ${ctx.exercises.length} exercises on ${ctx.workoutName}, ` +
        `for ${ctx.totals.totalReps} total reps and ${fmt(ctx.totals.totalVolume)} ${u} of volume` +
        (ctx.totals.durationMin
          ? ` in about ${ctx.totals.durationMin} ${ctx.totals.durationMin === 1 ? "minute" : "minutes"}.`
          : ".")
    );

    if (up + down + matched > 0) {
      const bits: string[] = [];
      if (up) bits.push(`${up} exercise${up > 1 ? "s" : ""} improved`);
      if (matched) bits.push(`${matched} held steady`);
      if (down) bits.push(`${down} dipped`);
      paras.push(`Versus the last time you trained these lifts, ${joinList(bits)}.`);
    }

    // Spotlight the biggest mover and any regression.
    const improved = ctx.exercises.filter((e) => e.trend === "improved");
    if (improved.length) {
      const star = improved.sort(
        (a, b) => b.today.totalVolume - b_prev(b) - (a.today.totalVolume - b_prev(a))
      )[0];
      paras.push(
        `Standout: ${star.name} — ${star.today.totalReps} reps and ${fmt(
          star.today.totalVolume
        )} ${u} of volume${
          star.previous ? `, up from ${fmt(star.previous.totalVolume)} ${u}` : ""
        }. ${star.suggestion.detail}`
      );
    }
    const regressed = ctx.exercises.filter((e) => e.trend === "regressed");
    if (regressed.length) {
      const r = regressed[0];
      paras.push(`Keep an eye on ${r.name}: it came down a touch. ${r.suggestion.detail}`);
    }

    // Readiness / bodyweight color.
    const context: string[] = [];
    if (ctx.bodyweight) {
      context.push(
        `Bodyweight is ${ctx.bodyweight.latest} ${u}` +
          (ctx.bodyweight.deltaFromPrevious != null && ctx.bodyweight.deltaFromPrevious !== 0
            ? ` (${signed(ctx.bodyweight.deltaFromPrevious)} ${u} vs last entry)`
            : "")
      );
    }
    if (ctx.readiness && (ctx.readiness.sleep || ctx.readiness.energy)) {
      const r = ctx.readiness;
      const rb: string[] = [];
      if (r.sleep != null) rb.push(`sleep ${r.sleep}/5`);
      if (r.energy != null) rb.push(`energy ${r.energy}/5`);
      if (r.soreness != null) rb.push(`soreness ${r.soreness}/5`);
      context.push(`readiness logged at ${rb.join(", ")}`);
    }
    if (context.length) paras.push(capitalize(joinList(context)) + ".");

    const bullets = buildBullets(ctx);

    return {
      provider: this.name,
      headline,
      summary: paras.join("\n\n"),
      bullets,
    };
  }
}

function b_prev(e: CoachContext["exercises"][number]): number {
  return e.previous ? e.previous.totalVolume : 0;
}

function buildHeadline(ctx: CoachContext, up: number, down: number): string {
  if (up > 0 && down === 0) {
    return `Strong ${ctx.workoutName} — ${up} lift${up > 1 ? "s" : ""} moved up. 💪`;
  }
  if (up > 0 && down > 0) {
    return `Mixed but productive ${ctx.workoutName}: ${up} up, ${down} to watch.`;
  }
  if (up === 0 && down === 0) {
    return `${ctx.workoutName} in the books — steady work banked.`;
  }
  return `${ctx.workoutName} logged — let's reset and come back fresh.`;
}

function buildBullets(ctx: CoachContext): string[] {
  const bullets: string[] = [];

  // One actionable bullet per exercise that's ready to progress, else its plan.
  const ready = ctx.exercises.filter(
    (e) => e.suggestion.kind === "increase-weight" || e.suggestion.kind === "small-increase"
  );
  for (const e of ready.slice(0, 4)) {
    bullets.push(`${e.name}: ${e.suggestion.action} next time — ${shorten(e.suggestion.detail)}`);
  }
  // Fill with a couple of "hold and build" lifts if we have room.
  if (bullets.length < 3) {
    for (const e of ctx.exercises) {
      if (ready.includes(e)) continue;
      bullets.push(`${e.name}: ${e.suggestion.action} — ${shorten(e.suggestion.detail)}`);
      if (bullets.length >= 4) break;
    }
  }

  // Weekly volume callouts (low/high only — most actionable).
  const lows = ctx.weeklyVolume.filter((v) => v.status === "Low");
  if (lows.length) {
    bullets.push(
      `Weekly volume low for ${lows.map((v) => v.muscle).join(", ")} — consider an extra set.`
    );
  }

  // Surface the first warning flag.
  const warn = ctx.flags.find((f) => f.kind === "fatigue" || f.kind === "pain-note");
  if (warn) bullets.push(warn.message);

  return bullets.slice(0, 6);
}

// ---- tiny text helpers (no numbers invented) -----------------------------
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n));
}
function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
function shorten(s: string): string {
  return s.length > 110 ? s.slice(0, 107).trimEnd() + "…" : s;
}
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
