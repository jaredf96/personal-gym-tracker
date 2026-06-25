import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { analyzeSession } from "../engine/analysis";
import { getSettings } from "../db/repo";
import { generateCoachSummary, getLatestReportForSession } from "../ai/coachService";
import { fmtNum, fmtWeight, signed, plural } from "../lib/format";
import { relativeDay } from "../lib/dates";
import { ScreenHeader, Pill, TrendPill, Empty } from "../components/ui";

export default function SummaryScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);

  const data = useLiveQuery(async () => {
    if (!sessionId) return null;
    const [analysis, settings, report] = await Promise.all([
      analyzeSession(sessionId),
      getSettings(),
      getLatestReportForSession(sessionId),
    ]);
    return { analysis, settings, report };
  }, [sessionId]);

  if (!data) return <div className="screen">Loading…</div>;
  if (!data.analysis) {
    return (
      <div className="screen">
        <ScreenHeader title="Summary" />
        <Empty>Session not found.</Empty>
      </div>
    );
  }

  const { analysis, settings, report } = data;
  const unit = settings.unit;

  async function generate() {
    if (!sessionId) return;
    setGenerating(true);
    try {
      await generateCoachSummary(sessionId);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="screen">
      <ScreenHeader
        title="Workout complete 🎉"
        subtitle={`${analysis.template?.name ?? "Workout"} · ${relativeDay(analysis.session.date)}`}
        right={
          <button className="btn-sm" onClick={() => navigate("/")}>
            Done
          </button>
        }
      />

      {/* Session totals */}
      <div className="card">
        <div className="row wrap">
          <Pill>{plural(analysis.totals.workingSets, "working set")}</Pill>
          <Pill>{analysis.totals.totalReps} reps</Pill>
          <Pill>
            {fmtNum(analysis.totals.totalVolume)} {unit} volume
          </Pill>
          {analysis.totals.durationMin != null && (
            <Pill>{analysis.totals.durationMin} min</Pill>
          )}
        </div>
      </div>

      {/* AI coach summary */}
      <div className="card" style={{ borderColor: "var(--accent-dim)" }}>
        <div className="row between">
          <h3>🤖 Coach summary</h3>
          {report && <span className="faint tiny">via {report.provider}</span>}
        </div>

        {report ? (
          <div className="mt">
            <div style={{ fontWeight: 600 }}>{report.headline}</div>
            {report.summary.split("\n\n").map((p, i) => (
              <p key={i} className="small muted" style={{ margin: "8px 0" }}>
                {p}
              </p>
            ))}
            {report.bullets.length > 0 && (
              <ul className="small" style={{ paddingLeft: 18, marginTop: 6 }}>
                {report.bullets.map((b, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {b}
                  </li>
                ))}
              </ul>
            )}
            <button className="btn-ghost btn-sm mt" onClick={generate} disabled={generating}>
              {generating ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        ) : (
          <div className="mt">
            <p className="small muted">
              Generate a plain-language recap of this session. The numbers come from the
              deterministic engine — the coach only explains them.
            </p>
            <button className="btn-primary btn-block" onClick={generate} disabled={generating}>
              {generating ? "Generating…" : "Generate Coach Summary"}
            </button>
          </div>
        )}
      </div>

      {/* Rule-engine flags */}
      {analysis.flags.length > 0 && (
        <div className="card">
          <h3 className="mb">Notes from the rule engine</h3>
          <div className="col" style={{ gap: 8 }}>
            {analysis.flags.map((f, i) => (
              <div key={i} className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                <span>{f.severity === "warn" ? "⚠️" : "💡"}</span>
                <span className="small muted">{f.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-exercise comparison + next-time suggestion */}
      <h3 className="mt-lg mb">Exercise breakdown</h3>
      {analysis.exercises.map((e) => {
        const c = e.comparison;
        return (
          <div key={e.exerciseId} className="card">
            <div className="row between">
              <h3>{e.name}</h3>
              <TrendPill trend={c.trend} />
            </div>
            <div className="row wrap mt small">
              <Pill>
                {c.current.setCount} × · {c.current.totalReps} reps
              </Pill>
              <Pill>top {fmtWeight(c.current.topWeight, unit)}</Pill>
              <Pill>
                {fmtNum(c.current.totalVolume)} {unit} vol
              </Pill>
              {c.previous && c.trend !== "new" && (
                <Pill tone={c.deltaTotalVolume >= 0 ? "green" : "red"}>
                  {signed(Math.round(c.deltaTotalVolume))} {unit} vs last
                </Pill>
              )}
            </div>
            <div
              className="mt small"
              style={{
                background: "var(--surface-2)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 11px",
              }}
            >
              <span style={{ color: "var(--accent)" }}>Next time: {e.suggestion.action}</span>
              <span className="muted"> — {e.suggestion.detail}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
