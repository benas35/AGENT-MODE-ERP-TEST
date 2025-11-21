import * as Sentry from "@sentry/react";

interface MonitoringContext {
  boundary?: string;
  componentStack?: string;
  tags?: Record<string, string>;
}

const isSentryConfigured = () => {
  if (typeof Sentry.captureException !== "function") return false;
  if (typeof Sentry.getCurrentHub !== "function") return true;
  const hub = Sentry.getCurrentHub();
  if (!hub || typeof hub.getClient !== "function") return false;
  return Boolean(hub.getClient());
};

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    return;
  }

  const environment = import.meta.env.VITE_SENTRY_ENV ?? import.meta.env.MODE ?? "development";
  const release = import.meta.env.VITE_RELEASE ?? import.meta.env.VITE_COMMIT_SHA;

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      Sentry.browserTracingIntegration({ tracePropagationTargets: [/^https?:\/\//] }),
      Sentry.replayIntegration({ blockAllMedia: true }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    sendClientReports: true,
  });
}

export function reportError(error: unknown, context?: MonitoringContext) {
  if (!isSentryConfigured()) return;

  Sentry.withScope((scope) => {
    if (context?.boundary) {
      scope.setTag("boundary", context.boundary);
    }

    if (context?.componentStack) {
      scope.setExtra("componentStack", context.componentStack);
    }

    if (context?.tags) {
      scope.setTags(context.tags);
    }

    Sentry.captureException(error);
  });
}

export function reportMessage(message: string, level: Sentry.SeverityLevel = "warning") {
  if (!isSentryConfigured()) return;
  Sentry.captureMessage(message, level);
}
