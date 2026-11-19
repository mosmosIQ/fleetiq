import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  Radio,
  Route,
  Settings,
  Truck,
  Navigation,
} from "lucide-react";

const ICON_SIZE = 18;

export default function DashboardLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">FIQ</span>
          FleetIQ
        </div>

        <NavLink to="/company-admin" end>
          <LayoutDashboard size={ICON_SIZE} />
          Dashboard
        </NavLink>

        <div className="sidebar-group">Operations</div>

        <NavLink to="/company-admin/trips">
          <Navigation size={ICON_SIZE} />
          Trip Manager
        </NavLink>

        <NavLink to="/company-admin/status-board">
          <Radio size={ICON_SIZE} />
          Status Board
        </NavLink>

        <NavLink to="/company-admin/route-templates">
          <Route size={ICON_SIZE} />
          Route Templates
        </NavLink>

        <div className="sidebar-group">Fleet</div>

        <NavLink to="/company-admin/fleet">
          <Truck size={ICON_SIZE} />
          Fleet Registry
        </NavLink>

        <NavLink to="/company-admin/documents">
          <FileText size={ICON_SIZE} />
          Documents
        </NavLink>

        <div className="sidebar-group">Account</div>

        <NavLink to="/company-admin/notifications">
          <Bell size={ICON_SIZE} />
          Notifications
        </NavLink>

        <NavLink to="/company-admin/settings">
          <Settings size={ICON_SIZE} />
          Settings
        </NavLink>

        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={ICON_SIZE} />
          Log out
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
