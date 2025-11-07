export function AppSplash() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground"
      role="status"
      aria-live="polite"
    >
      <span className="text-base font-semibold">Loading Oldauta…</span>
      <span className="text-sm text-muted-foreground">Preparing your workspace</span>
    </div>
  );
}
