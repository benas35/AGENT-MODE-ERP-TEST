import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Vehicles from "./pages/Vehicles";
import WorkOrders from "./pages/WorkOrders";
import Inventory from "./pages/Inventory";
import Parts from "./pages/Parts";
import PurchaseOrders from "./pages/PurchaseOrders";
import Suppliers from "./pages/Suppliers";
import Estimates from "./pages/Estimates";
import Invoices from "./pages/Invoices";
import Planner from "./pages/Planner";
import Workflow from "./pages/Workflow";
import TimeClock from "./pages/TimeClock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import TireStorage from "./pages/TireStorage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PortalRoutes from "./pages/portal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/portal/*" element={<PortalRoutes />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/vehicles" element={<Vehicles />} />
                      <Route path="/work-orders" element={<WorkOrders />} />
                      <Route path="/inventory" element={<Inventory />} />
                      <Route path="/parts" element={<Parts />} />
                      <Route path="/purchase-orders" element={<PurchaseOrders />} />
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/estimates" element={<Estimates />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/planner" element={<Planner />} />
                      <Route path="/workflow" element={<Workflow />} />
                      <Route path="/time-clock" element={<TimeClock />} />
                      <Route path="/tire-storage" element={<TireStorage />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
