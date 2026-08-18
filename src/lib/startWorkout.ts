import { startSession, listTemplates } from "../db/repo";

/**
 * Shared "start a workout" flow for every entry point (Today, Logger, Calendar).
 * If another workout is already in progress with sets logged, the user is asked
 * what to do instead of silently orphaning it.
 *
 * Returns the session id to navigate to, or null if the user backed out.
 */
export async function startWorkoutFlow(templateId: string): Promise<string | null> {
  const res = await startSession(templateId);

  if (res.status !== "blocked") return res.session.id;

  const templates = await listTemplates();
  const openName =
    templates.find((t) => t.id === res.session.templateId)?.name ?? "another workout";
  const wantedName = templates.find((t) => t.id === templateId)?.name ?? "this workout";

  const resume = window.confirm(
    `${openName} is still in progress with ${res.loggedSets} set${
      res.loggedSets === 1 ? "" : "s"
    } logged.\n\nOK = resume ${openName}\nCancel = finish it and start ${wantedName}`
  );
  if (resume) return res.session.id;

  const forced = await startSession(templateId, { force: true });
  return forced.status === "blocked" ? null : forced.session.id;
}
