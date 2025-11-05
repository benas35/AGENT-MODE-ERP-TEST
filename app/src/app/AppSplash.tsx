interface AppSplashProps {
  message?: string;
}

export function AppSplash({ message = "Loading Oldauta…" }: AppSplashProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center text-foreground">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
      <p className="text-sm font-medium" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
