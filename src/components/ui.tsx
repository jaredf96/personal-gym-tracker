import type { ReactNode } from "react";
import type { Trend } from "../engine/comparison";
import type { VolumeStatus } from "../engine/volume";

// Small shared presentational helpers.

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "green" | "amber" | "red";
}) {
  return <span className={`pill ${tone === "default" ? "" : tone}`}>{children}</span>;
}

export function TrendPill({ trend }: { trend: Trend }) {
  const map: Record<Trend, { tone: "green" | "red" | "default" | "accent"; label: string }> = {
    improved: { tone: "green", label: "▲ Improved" },
    regressed: { tone: "red", label: "▼ Down" },
    matched: { tone: "default", label: "= Matched" },
    new: { tone: "accent", label: "★ New" },
  };
  const { tone, label } = map[trend];
  return <Pill tone={tone}>{label}</Pill>;
}

export function VolumePill({ status }: { status: VolumeStatus }) {
  const map: Record<VolumeStatus, { tone: "green" | "amber" | "red" | "default"; label: string }> =
    {
      "in-range": { tone: "green", label: "In range" },
      low: { tone: "amber", label: "Low" },
      high: { tone: "red", label: "High" },
      "no-target": { tone: "default", label: "No target" },
    };
  const { tone, label } = map[status];
  return <Pill tone={tone}>{label}</Pill>;
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="row between" style={{ alignItems: "flex-start", marginBottom: 14 }}>
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="muted small">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
