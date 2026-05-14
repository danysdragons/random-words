import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled app error", error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="error-boundary" role="alert">
        <div>
          <strong>Random Words could not render this view.</strong>
          <p>
            Try reloading the page. If the problem persists, clear local app data from browser
            storage and reload.
          </p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </main>
    );
  }
}
