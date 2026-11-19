import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  PlusCircle,
} from "lucide-react";

const ICON_SIZE = 18;

export default function SuperAdminLayout() {
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
          FleetIQ Admin
        </div>

        <NavLink to="/super-admin" end>
          <LayoutDashboard size={ICON_SIZE} />
          Overview
        </NavLink>

        <NavLink to="/super-admin/companies" end>
          <Building2 size={ICON_SIZE} />
          Companies
        </NavLink>

        <NavLink to="/super-admin/companies/new">
          <PlusCircle size={ICON_SIZE} />
          Add Company
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
