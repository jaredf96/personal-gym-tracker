import { Component, type ErrorInfo, type ReactNode } from "react";
import { repairAndPropagate } from "../sync/supabaseSync";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// A render crash used to unmount the whole tree and leave a blank page with no
// way back. This catches it, shows what happened, and offers a data repair —
// most crashes here come from legacy rows that predate the current model.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Screen crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="app">
        <div className="screen">
          <h1>Something broke</h1>
          <div className="muted small">
            This screen hit an error instead of rendering. Your logged data is safe.
          </div>

          <div className="card mt">
            <h3 className="mb">Details</h3>
            <div className="small" style={{ color: "var(--red)", wordBreak: "break-word" }}>
              {error.message || String(error)}
            </div>
          </div>

          <div className="col mt">
            <button
              className="btn-primary btn-block btn-lg"
              onClick={async () => {
                try {
                  const r = await repairAndPropagate();
                  alert(
                    `Repair complete.\n\nFixed ${r.normalizedExercises} legacy exercise(s), removed ${r.removedOrphanExercises} unused, closed ${r.closedStaleSessions} unfinished session(s).`
                  );
                } catch (e) {
                  alert(`Repair failed: ${(e as Error).message}`);
                }
                window.location.hash = "#/";
                window.location.reload();
              }}
            >
              Repair data & reload
            </button>
            <button
              className="btn-block"
              onClick={() => {
                window.location.hash = "#/";
                this.setState({ error: null });
              }}
            >
              Back to Today
            </button>
          </div>
        </div>
      </div>
    );
  }
}
