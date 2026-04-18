import { Navigate, Route, Routes } from "react-router-dom";

import { DesktopDashboardPage } from "@/pages/DesktopDashboardPage";
import { MobileControlPage } from "@/pages/MobileControlPage";
import { RecorderPage } from "@/pages/RecorderPage";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

function LandingRedirect() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return <Navigate to={isMobile ? "/control" : "/dashboard"} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />
      <Route path="/dashboard" element={<DesktopDashboardPage />} />
      <Route path="/control" element={<MobileControlPage />} />
      <Route path="/recorder" element={<RecorderPage />} />
      <Route path="*" element={<LandingRedirect />} />
    </Routes>
  );
}
