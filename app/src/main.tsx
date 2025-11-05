import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { BootGuard } from "./app/BootGuard";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { SupabaseProvider } from "@/integrations/supabase/SupabaseProvider";
import { AuthProvider } from "./hooks/useAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { router } from "./app/router";
import { AppSplash } from "./app/AppSplash";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element with id 'root' was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary resetKeys={[window.location.pathname]}>
      <QueryClientProvider client={queryClient}>
        <BootGuard>
          <Suspense fallback={<AppSplash />}>
            <SupabaseProvider>
              <AuthProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <RouterProvider router={router} />
                </TooltipProvider>
              </AuthProvider>
            </SupabaseProvider>
          </Suspense>
        </BootGuard>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
