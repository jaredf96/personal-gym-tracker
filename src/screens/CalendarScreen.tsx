import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../db/db";
import { listTemplates, listCardioLogs, getWeeklySchedule } from "../db/repo";
import { buildCalendarMonth, type CalendarDay, type DayStatus } from "../engine/schedule";
import { ScreenHeader } from "../components/ui";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarScreen() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11

  const data = useLiveQuery(async () => {
    const [schedule, templates, sessions, cardio] = await Promise.all([
      getWeeklySchedule(),
      listTemplates(),
      db.workoutSessions.toArray(),
      listCardioLogs(),
    ]);
    return buildCalendarMonth(year, month, schedule, templates, sessions, cardio);
  }, [year, month]);

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function onCellClick(day: CalendarDay) {
    if (day.sessionId) navigate(`/summary/${day.sessionId}`);
  }

  return (
    <div className="screen">
      <ScreenHeader title="Calendar" subtitle="Your training log by day" />

      <div className="card">
        <div className="row between mb">
          <button className="btn-sm" onClick={() => shift(-1)}>
            ‹
          </button>
          <h3>{monthLabel}</h3>
          <button className="btn-sm" onClick={() => shift(1)}>
            ›
          </button>
        </div>

        <div className="cal-grid" style={{ marginBottom: 6 }}>
          {DOW.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
        </div>

        {!data ? (
          <div className="cal-grid">{Array.from({ length: 35 }, (_, i) => (<div key={i} className="skel" style={{ aspectRatio: "1 / 1", borderRadius: 10 }} />))}</div>
        ) : (
          <div className="cal-grid">
            {data.map((day) => (
              <Cell key={day.date} day={day} onClick={() => onCellClick(day)} />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="mb">Legend</h3>
        <div className="cal-legend">
          <span className="row">
            <span className="cal-dot" style={{ background: "var(--text)" }} /> Completed lift
          </span>
          <span className="row">
            <span className="cal-dot" style={{ background: "var(--text-faint)", border: "1px solid var(--text-faint)" }} />{" "}
            Planned
          </span>
          <span className="row">
            <span className="cal-dot" style={{ background: "var(--green)" }} /> Cardio
          </span>
          <span className="row">
            <span className="cal-dot" style={{ background: "var(--red)" }} /> Missed
          </span>
          <span className="row">
            <span className="cal-dot" style={{ background: "var(--surface-3)" }} /> Rest
          </span>
        </div>
        <div className="faint tiny mt">Tap a completed day to see that session.</div>
      </div>

      <Link to="/exercises" className="btn btn-block">
        Exercise history & PRs →
      </Link>
    </div>
  );
}

function Cell({ day, onClick }: { day: CalendarDay; onClick: () => void }) {
  const filled = day.status === "completed";
  const color = day.color ?? undefined;

  // Background tint for completed lifts (template color), subtle for others.
  let bg = "var(--surface)";
  let borderColor = "var(--border)";
  if (day.status === "completed" && color) {
    bg = color + "33"; // ~20% alpha
    borderColor = color;
  } else if (day.status === "cardio-done") {
    bg = "rgba(62,207,142,0.18)";
    borderColor = "var(--green)";
  }

  const tag = statusTag(day);

  return (
    <div
      className={`cal-cell${day.inMonth ? "" : " out"}${day.isToday ? " today" : ""}${
        filled ? " filled" : ""
      }${day.sessionId ? " clickable" : ""}`}
      style={{ background: bg, borderColor }}
      onClick={onClick}
      title={`${day.scheduleLabel} · ${day.status}`}
    >
      <span className="cal-num">{Number(day.date.slice(8, 10))}</span>
      {tag && (
        <span className="cal-tag" style={{ color: tagColor(day.status, color) }}>
          {tag}
        </span>
      )}
    </div>
  );
}

function statusTag(day: CalendarDay): string {
  switch (day.status) {
    case "completed":
      return abbr(day.template?.name);
    case "planned":
      return abbr(day.template?.name);
    case "cardio-done":
      return `${day.cardioMinutes ?? ""}′`;
    case "cardio":
      return "Z2";
    case "missed":
      return "—";
    case "rest":
      return ""; // declutter — rest days just show the date number
  }
}

function tagColor(status: DayStatus, color?: string): string {
  if (status === "completed" && color) return color;
  if (status === "planned" && color) return color;
  if (status === "cardio-done" || status === "cardio") return "var(--green)";
  if (status === "missed") return "var(--red)";
  return "var(--text-faint)";
}

// "Upper A" -> "UA", "Lower B" -> "LB"
function abbr(name?: string): string {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
