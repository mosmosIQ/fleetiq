import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import { getMe, login } from "../../services/authService";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function redirectIfLoggedIn() {
      const token = localStorage.getItem("token");

      if (!token) {
        setCheckingSession(false);
        return;
      }

      try {
        const user = await getMe();

        if (user.role === "SUPER_ADMIN") {
          navigate("/super-admin", { replace: true });
        } else {
          navigate("/company-admin", { replace: true });
        }
      } catch (error) {
        console.error("Session check failed", error);
        localStorage.removeItem("token");
        setCheckingSession(false);
      }
    }

    redirectIfLoggedIn();
  }, [navigate]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      localStorage.setItem("token", result.token);

      if (result.user.role === "SUPER_ADMIN") {
        navigate("/super-admin");
      } else {
        navigate("/company-admin");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Login failed. Check your email and password."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <AuthLayout>
        <div className="login-card">
          <div className="login-loading">Checking your session...</div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-header">
          <span className="login-eyebrow">Welcome back</span>
          <h1>Sign in to your account</h1>
          <p>
            Access FleetIQ using your Super Admin or Company Admin account.
          </p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Email Address</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        <button className="button login-button" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="login-footer">
        </div>
      </form>
    </AuthLayout>
  );
}