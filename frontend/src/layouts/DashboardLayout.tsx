import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function DashboardLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>FleetIQ</h2>

        <NavLink to="/company-admin" end>
          Dashboard
        </NavLink>

        <NavLink to="/company-admin/trucks">
          Truck Registry
        </NavLink>

        <NavLink to="/company-admin/drivers">
          Driver Profiles
        </NavLink>

        <NavLink to="/company-admin/trips">
          Trip Manager
        </NavLink>

        <NavLink to="/company-admin/status-board">
          Status Board
        </NavLink>

        <NavLink to="/company-admin/documents">
          Documents
        </NavLink>

        <NavLink to="/company-admin/notifications">
          Notifications
        </NavLink>

        <NavLink to="/company-admin/settings">
          Settings
        </NavLink>

        <button
          type="button"
          className="button button-danger"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <main className="main">
        <div className="topbar">FleetIQ Company Dashboard</div>
        <Outlet />
      </main>
    </div>
  );
}