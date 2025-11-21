import * as Sentry from "@sentry/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { initMonitoring, reportError, reportMessage } from "../monitoring";

type Mock = ReturnType<typeof vi.fn>;

type HubMock = { getClient: Mock };

// var keeps the mock factory from hitting the temporal dead zone when hoisted
var capturedScopeSpy: Mock | undefined;

vi.mock("@sentry/react", () => {
  const withScopeSpy = vi.fn((callback: (scope: any) => void) => {
    const scope = {
      setTag: vi.fn(),
      setExtra: vi.fn(),
      setTags: vi.fn(),
    };
    callback(scope);
  });

  capturedScopeSpy = withScopeSpy;

  const init = vi.fn();
  const captureException = vi.fn();
  const captureMessage = vi.fn();
  const browserTracingIntegration = vi.fn(() => ({ name: "browserTracingIntegration" }));
  const replayIntegration = vi.fn(() => ({ name: "replayIntegration" }));
  const getCurrentHub = vi.fn<HubMock, []>(() => ({ getClient: vi.fn(() => ({ id: "client" })) }));

  return {
    init,
    captureException,
    captureMessage,
    browserTracingIntegration,
    replayIntegration,
    withScope: withScopeSpy,
    getCurrentHub,
  } satisfies Partial<typeof Sentry>;
});

const getHubMock = () => Sentry.getCurrentHub as unknown as Mock;
const initMock = () => Sentry.init as unknown as Mock;
const captureExceptionMock = () => Sentry.captureException as unknown as Mock;
const captureMessageMock = () => Sentry.captureMessage as unknown as Mock;
const getScopeSpy = () => capturedScopeSpy as Mock;

describe("monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_SENTRY_DSN", "");
    vi.stubEnv("VITE_SENTRY_ENV", "");
    vi.stubEnv("VITE_COMMIT_SHA", "");
    getHubMock().mockReturnValue({ getClient: vi.fn(() => ({ id: "client" })) });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("initializes Sentry when DSN is provided", () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://dsn.example");
    vi.stubEnv("VITE_SENTRY_ENV", "staging");
    vi.stubEnv("VITE_COMMIT_SHA", "abc123");

    initMonitoring();

    expect(initMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://dsn.example",
        environment: "staging",
        release: "abc123",
      }),
    );
  });

  it("does not initialize when DSN is missing", () => {
    initMonitoring();
    expect(initMock()).not.toHaveBeenCalled();
  });

  it("skips reporting when Sentry client is missing", () => {
    getHubMock().mockReturnValue({ getClient: vi.fn(() => null) });

    reportError(new Error("boom"));
    reportMessage("warn", "warning");

    expect(captureExceptionMock()).not.toHaveBeenCalled();
    expect(captureMessageMock()).not.toHaveBeenCalled();
  });

  it("reports errors with boundary context", () => {
    reportError(new Error("boom"), { boundary: "TestBoundary", componentStack: "stack" });

    expect(captureExceptionMock()).toHaveBeenCalled();
    expect(getScopeSpy()).toHaveBeenCalled();
  });

  it("reports messages when client is available", () => {
    reportMessage("deployment configured", "info");
    expect(captureMessageMock()).toHaveBeenCalledWith("deployment configured", "info");
  });
});
