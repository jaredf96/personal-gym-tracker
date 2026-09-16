import { describe, it, expect } from "vitest";
import { isLiveOpenSession } from "../activeSession";
import type { WorkoutSession } from "../../types";

const TODAY = "2026-09-16";

function session(date: string, ended = false): WorkoutSession {
  return {
    id: `s-${date}`,
    templateId: "upper-b",
    date,
    startedAt: `${date}T12:00:00.000Z`,
    endedAt: ended ? `${date}T13:00:00.000Z` : undefined,
  };
}

describe("isLiveOpenSession", () => {
  it("REGRESSION: an empty session left open on an earlier day is not in progress", () => {
    expect(isLiveOpenSession(session("2026-06-25"), 0, TODAY)).toBe(false);
  });

  it("a session started today is in progress even before any sets", () => {
    expect(isLiveOpenSession(session(TODAY), 0, TODAY)).toBe(true);
  });

  it("an earlier-day session with sets is still in progress, so it isn't lost", () => {
    expect(isLiveOpenSession(session("2026-09-15"), 3, TODAY)).toBe(true);
  });

  it("a finished session is never in progress", () => {
    expect(isLiveOpenSession(session(TODAY, true), 5, TODAY)).toBe(false);
  });
});
