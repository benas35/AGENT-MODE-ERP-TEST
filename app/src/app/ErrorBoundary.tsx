import { Component, DependencyList, ErrorInfo, ReactNode, useEffect, useMemo, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapErrorToFriendlyMessage, formatErrorForDisplay } from "@/lib/errorHandling";
import { useNavigate, useRouteError } from "react-router-dom";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Optional render function to customise the fallback UI.
   * It receives the error instance and a reset handler that clears the boundary state.
   */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
  /** Called after the boundary has been reset */
  onReset?: () => void;
  /** Keys that will reset the boundary when their values change */
  resetKeys?: DependencyList;
  /** Optional human-readable label for analytics/fallback copy */
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught error", error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (!this.state.hasError) return;

    const { resetKeys } = this.props;
    if (!resetKeys) return;

    const previousKeys = prevProps.resetKeys ?? [];

    if (resetKeys.length !== previousKeys.length) {
      this.reset();
      return;
    }

    const hasChanged = resetKeys.some((value, index) => Object.is(value, previousKeys[index]) === false);
    if (hasChanged) {
      this.reset();
    }
  }

  private reset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const fallback = this.props.fallback ?? (({ error, reset }: { error: Error; reset: () => void }) => (
        <DefaultErrorFallback error={error} reset={reset} name={this.props.name} />
      ));

      return fallback({ error: this.state.error, reset: this.reset });
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
  name?: string;
}

export function DefaultErrorFallback({ error, reset, name }: DefaultErrorFallbackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const copy = useMemo(() => mapErrorToFriendlyMessage(error, name), [error, name]);

  useEffect(() => {
    containerRef.current?.focus({ preventScroll: false });
  }, []);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-6">
      <div
        ref={containerRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        tabIndex={-1}
        className="w-full max-w-lg rounded-lg border border-destructive/20 bg-destructive/5 p-6 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive" aria-hidden="true">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">{copy.title}</h2>
              <p className="text-sm text-muted-foreground">{copy.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={reset}>{"Try again"}</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>Reload</Button>
            </div>
            {import.meta.env.DEV && error?.message && (
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Technical details: {error.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RouteBoundary({ children, name }: { children: ReactNode; name?: string }) {
  return (
    <ErrorBoundary name={name}>{children}</ErrorBoundary>
  );
}

export const createRouteErrorBoundary = (name?: string) => {
  const RouteErrorBoundaryComponent = () => {
    const error = useRouteError();
    const navigate = useNavigate();

    const derivedError = error instanceof Error
      ? error
      : new Error(formatErrorForDisplay(error));

    return (
      <DefaultErrorFallback
        error={derivedError}
        reset={() => navigate(0)}
        name={name}
      />
    );
  };

  RouteErrorBoundaryComponent.displayName = name ? `${name}RouteErrorBoundary` : "RouteErrorBoundary";
  return RouteErrorBoundaryComponent;
};
