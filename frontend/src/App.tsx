import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import CompaniesPage from "./pages/super-admin/CompaniesPage";
import AddCompanyPage from "./pages/super-admin/AddCompanyPage";

import DashboardPage from "./pages/company-admin/DashboardPage";
import FleetRegistryPage from "./pages/company-admin/FleetRegistryPage";
import DriverDocumentsPage from "./pages/company-admin/DriverDocumentsPage";
import TruckDocumentsPage from "./pages/company-admin/TruckDocumentsPage";
import TripManagerPage from "./pages/company-admin/TripManagerPage";
import StatusBoardPage from "./pages/company-admin/StatusBoardPage";
import DocumentsPage from "./pages/company-admin/DocumentsPage";
import NotificationsPage from "./pages/company-admin/NotificationsPage";
import SettingsPage from "./pages/company-admin/SettingsPage";
import DashboardLayout from "./layouts/DashboardLayout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import RouteTemplatesPage from "./pages/company-admin/RouteTemplatesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/super-admin"
        element={
          <RoleProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <SuperAdminLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/new" element={<AddCompanyPage />} />
      </Route>

      <Route
        path="/company-admin"
        element={
          <RoleProtectedRoute allowedRoles={["COMPANY_ADMIN"]}>
            <DashboardLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="fleet" element={<FleetRegistryPage />} />
        <Route path="documents/drivers" element={<DriverDocumentsPage />} />
        <Route path="documents/trucks" element={<TruckDocumentsPage />} />
        <Route path="driver-documents" element={<Navigate to="/company-admin/documents/drivers" replace />} />
        <Route path="trucks" element={<Navigate to="/company-admin/fleet" replace />} />
        <Route path="trailers" element={<Navigate to="/company-admin/fleet" replace />} />
        <Route path="drivers" element={<Navigate to="/company-admin/fleet" replace />} />
        <Route path="trips" element={<TripManagerPage />} />
        <Route path="route-templates" element={<RouteTemplatesPage />} />
        <Route path="status-board" element={<StatusBoardPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}