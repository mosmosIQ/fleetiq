
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import { register } from "../../services/authService";

export default function SignupPage() {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await register(companyName, email, password);

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Account created successfully. Please sign in.",
        },
      });
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form className="login-card" onSubmit={handleSignup}>
        <div className="login-header">
          <span className="login-eyebrow">
            Get started
          </span>

          <h1>Create your account</h1>

          <p>
            Create your FleetIQ Company Admin account to get
            started.
          </p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Company Name</label>

          <input
            className="input"
            type="text"
            value={companyName}
            onChange={(e) =>
              setCompanyName(e.target.value)
            }
            placeholder="Your company name"
            required
          />
        </div>

        <div className="form-group">
          <label>Email Address</label>

          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
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
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Create a password"
            required
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>

          <input
            className="input"
            type="password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            placeholder="Confirm your password"
            required
          />
        </div>

        <button
          className="button login-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Creating account..."
            : "Create Account"}
        </button>

        <div className="login-footer">
          <span>Already have an account? </span>

          <Link to="/login">
            Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

