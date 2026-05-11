import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import CompaniesPage from "./pages/super-admin/CompaniesPage";
import AddCompanyPage from "./pages/super-admin/AddCompanyPage";
import SubscriptionsPage from "./pages/super-admin/SubscriptionsPage";

import DashboardPage from "./pages/company-admin/DashboardPage";
import TruckRegistryPage from "./pages/company-admin/TruckRegistryPage";
import DriverProfilesPage from "./pages/company-admin/DriverProfilesPage";
import TripManagerPage from "./pages/company-admin/TripManagerPage";
import StatusBoardPage from "./pages/company-admin/StatusBoardPage";
import DocumentsPage from "./pages/company-admin/DocumentsPage";
import NotificationsPage from "./pages/company-admin/NotificationsPage";
import SettingsPage from "./pages/company-admin/SettingsPage";

import DashboardLayout from "./layouts/DashboardLayout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />

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
        <Route path="subscriptions" element={<SubscriptionsPage />} />
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
        <Route path="trucks" element={<TruckRegistryPage />} />
        <Route path="drivers" element={<DriverProfilesPage />} />
        <Route path="trips" element={<TripManagerPage />} />
        <Route path="status-board" element={<StatusBoardPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}