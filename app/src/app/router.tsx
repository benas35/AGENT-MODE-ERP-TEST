import { createBrowserRouter, Outlet } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Vehicles from "@/pages/Vehicles";
import WorkOrders from "@/pages/WorkOrders";
import Inventory from "@/pages/Inventory";
import Parts from "@/pages/Parts";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Suppliers from "@/pages/Suppliers";
import Estimates from "@/pages/Estimates";
import Invoices from "@/pages/Invoices";
import Planner from "@/pages/Planner";
import Workflow from "@/pages/Workflow";
import TimeClock from "@/pages/TimeClock";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import TireStorage from "@/pages/TireStorage";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import PortalRoutes from "@/pages/portal";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGate } from "@/features/auth/AuthGate";
import { RouteBoundary, createRouteErrorBoundary } from "./ErrorBoundary";

const AppShellBoundary = createRouteErrorBoundary("App shell");
const PortalBoundary = createRouteErrorBoundary("Customer portal");

const AppShell = () => (
  <AuthGate>
    <MainLayout>
      <Outlet />
    </MainLayout>
  </AuthGate>
);

const HealthRoute = () => (
  <div className="flex min-h-[200px] items-center justify-center bg-background p-6 text-sm text-foreground">
    OK — Oldauta build {import.meta.env.VITE_APP_ENV ?? "local"}
  </div>
);

const withBoundary = (element: JSX.Element, name: string) => (
  <RouteBoundary name={name}>{element}</RouteBoundary>
);

export const router = createBrowserRouter([
  { path: "/health", element: <HealthRoute /> },
  { path: "/auth", element: <Auth /> },
  {
    path: "/portal/*",
    element: withBoundary(<PortalRoutes />, "Customer portal"),
    errorElement: <PortalBoundary />,
  },
  {
    path: "/",
    element: <AppShell />,
    errorElement: <AppShellBoundary />,
    children: [
      { index: true, element: withBoundary(<Dashboard />, "Dashboard") },
      { path: "customers", element: withBoundary(<Customers />, "Customers") },
      { path: "vehicles", element: withBoundary(<Vehicles />, "Vehicles") },
      { path: "work-orders", element: withBoundary(<WorkOrders />, "Work orders") },
      { path: "inventory", element: withBoundary(<Inventory />, "Inventory") },
      { path: "parts", element: withBoundary(<Parts />, "Parts") },
      { path: "purchase-orders", element: withBoundary(<PurchaseOrders />, "Purchase orders") },
      { path: "suppliers", element: withBoundary(<Suppliers />, "Suppliers") },
      { path: "estimates", element: withBoundary(<Estimates />, "Estimates") },
      { path: "invoices", element: withBoundary(<Invoices />, "Invoices") },
      { path: "planner", element: withBoundary(<Planner />, "Planner") },
      { path: "workflow", element: withBoundary(<Workflow />, "Workflow") },
      { path: "time-clock", element: withBoundary(<TimeClock />, "Time clock") },
      { path: "reports", element: withBoundary(<Reports />, "Reports") },
      { path: "settings", element: withBoundary(<Settings />, "Settings") },
      { path: "tire-storage", element: withBoundary(<TireStorage />, "Tire storage") },
      { path: "*", element: <NotFound /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
