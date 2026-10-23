import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import "@fontsource/source-sans-3/latin-300.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "./styles.css";
import App from "./ClientStudio";
class WorkspaceBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Workspace view failed", error);
  }
  render() {
    return this.state.failed ? (
      <main className="startup">
        <img width="150" src="/rabobank-wordmark.svg" alt="Rabobank"/>
        <h2>This view could not open.</h2>
        <p>
          Saved engagements and review copies remain in the local workspace.
        </p>
        <button className="btn navy" onClick={() => location.reload()}>
          Reload workspace
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <WorkspaceBoundary>
    <App />
  </WorkspaceBoundary>,
);
