import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

function Item({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        <Item
          to="/"
          label="Today"
          icon={
            <svg viewBox="0 0 24 24" {...stroke}>
              <path d="M3 11l9-8 9 8" />
              <path d="M5 10v10h14V10" />
            </svg>
          }
        />
        <Item
          to="/workout"
          label="Log"
          icon={
            <svg viewBox="0 0 24 24" {...stroke}>
              <path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12" />
            </svg>
          }
        />
        <Item
          to="/calendar"
          label="Calendar"
          icon={
            <svg viewBox="0 0 24 24" {...stroke}>
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
          }
        />
        <Item
          to="/dashboard"
          label="Stats"
          icon={
            <svg viewBox="0 0 24 24" {...stroke}>
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
          }
        />
        <Item
          to="/settings"
          label="Settings"
          icon={
            <svg viewBox="0 0 24 24" {...stroke}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 2h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 22h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6A7 7 0 0 0 19 12z" />
            </svg>
          }
        />
      </div>
    </nav>
  );
}
