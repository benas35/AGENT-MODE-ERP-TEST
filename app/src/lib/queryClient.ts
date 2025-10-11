import { QueryClient } from "@tanstack/react-query";

const MAX_DELAY = 30_000;

const shouldRetry = (failureCount: number, error: unknown) => {
  if (failureCount >= 3) return false;

  if (error && typeof error === "object") {
    if ("status" in error) {
      const status = Number((error as { status?: number }).status);
      if (!Number.isNaN(status) && status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }
  }

  if (error instanceof Error && error.name === "AbortError") {
    return false;
  }

  return true;
};

const retryDelay = (attemptIndex: number) => {
  const baseDelay = 1000 * 2 ** attemptIndex;
  return Math.min(baseDelay, MAX_DELAY);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay,
      staleTime: 30_000,
    },
    mutations: {
      retry: shouldRetry,
      retryDelay,
    },
  },
});

export type AppQueryClient = typeof queryClient;
