import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import { ToastProvider } from "./components/Toast";
import AuthGate from "./auth/AuthGate";
import TodayScreen from "./screens/TodayScreen";
import LoggerScreen from "./screens/LoggerScreen";
import SummaryScreen from "./screens/SummaryScreen";
import CalendarScreen from "./screens/CalendarScreen";
import HistoryScreen from "./screens/HistoryScreen";
import ExerciseHistoryScreen from "./screens/ExerciseHistoryScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";

export default function App() {
  return (
    <ToastProvider>
      <AuthGate>
        <div className="app">
          <Routes>
            <Route path="/" element={<TodayScreen />} />
            <Route path="/workout" element={<LoggerScreen />} />
            <Route path="/workout/:sessionId" element={<LoggerScreen />} />
            <Route path="/summary/:sessionId" element={<SummaryScreen />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/exercises" element={<HistoryScreen />} />
            <Route path="/exercises/:exerciseId" element={<ExerciseHistoryScreen />} />
            <Route path="/history" element={<Navigate to="/calendar" replace />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BottomNav />
        </div>
      </AuthGate>
    </ToastProvider>
  );
}
