import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function SuperAdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>FleetIQ Admin</h2>

        <NavLink to="/super-admin" end>
          Overview
        </NavLink>
        <NavLink to="/super-admin/companies">
          Companies
        </NavLink>
        <NavLink to="/super-admin/companies/new">
          Add Company
        </NavLink>
        <NavLink to="/super-admin/subscriptions">
          Subscriptions
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
        <div className="topbar">FleetIQ SaaS Owner Panel</div>
        <Outlet />
      </main>
    </div>
  );
}