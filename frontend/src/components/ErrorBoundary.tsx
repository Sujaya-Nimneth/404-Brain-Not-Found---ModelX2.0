import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected rendering error occurred.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ATIE dashboard render error:", error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 py-12">
          <section
            role="alert"
            className="w-full rounded-[2rem] border border-clay/30 bg-cream/95 p-8 text-center shadow-card"
          >
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#8b3e2b]">
              Dashboard recovery
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
              Something interrupted this view.
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              {this.state.message}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cream transition hover:bg-moss"
              >
                Reload dashboard
              </button>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
