import { Navigate, Route, Routes } from "react-router-dom";
import { PortalSessionProvider } from "@/features/customer-portal/context/PortalSessionContext";
import { PortalLoginPage } from "@/features/customer-portal/pages/PortalLoginPage";
import { PortalVerifyPage } from "@/features/customer-portal/pages/PortalVerifyPage";
import { PortalDashboardPage } from "@/features/customer-portal/pages/PortalDashboardPage";

const PortalRoutes = () => (
  <PortalSessionProvider>
    <Routes>
      <Route index element={<PortalLoginPage />} />
      <Route path="session" element={<PortalVerifyPage />} />
      <Route path="app" element={<PortalDashboardPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  </PortalSessionProvider>
);

export default PortalRoutes;
