"use client";
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; section?: string }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error) {
    // Report to Sentry if available
    const w = typeof window !== "undefined" ? (window as unknown as { Sentry?: { captureException: (e: unknown) => void } }) : null;
    if (w?.Sentry) {
      w.Sentry.captureException(error);
    }
    console.error(`[ErrorBoundary${this.props.section ? ` - ${this.props.section}` : ""}]`, error);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 mb-3">Something went wrong loading this section.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
