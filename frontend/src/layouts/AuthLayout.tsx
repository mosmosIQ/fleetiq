interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-logo">FIQ</div>

          <h1>FleetIQ</h1>

          <p>
            Smart fleet management for trucks, drivers, trips, SMS updates, and live fleet status.
          </p>

          <div className="auth-feature-list">
            <div>Live trip status tracking</div>
            <div>SMS driver updates</div>
            <div>Truck and driver management</div>
            <div>Standard and Premium SaaS plans</div>
          </div>
        </div>

        <div className="auth-form-panel">
          {children}
        </div>
      </div>
    </div>
  );
}