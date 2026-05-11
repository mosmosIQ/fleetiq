import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getMe } from "../services/authService";
import { AuthUser, UserRole } from "../types/auth.types";

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function RoleProtectedRoute({
  allowedRoles,
  children
}: RoleProtectedRouteProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState("");

  useEffect(() => {
    async function checkUser() {
      const token = localStorage.getItem("token");

      if (!token) {
        setRedirectPath("/login");
        setLoading(false);
        return;
      }

      try {
        const currentUser = await getMe();

        if (!allowedRoles.includes(currentUser.role)) {
          if (currentUser.role === "SUPER_ADMIN") {
            setRedirectPath("/super-admin");
          } else {
            setRedirectPath("/company-admin");
          }

          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error("Auth check failed", error);
        localStorage.removeItem("token");
        setRedirectPath("/login");
      } finally {
        setLoading(false);
      }
    }

    checkUser();
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="page">
        <div className="card">Checking access...</div>
      </div>
    );
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}