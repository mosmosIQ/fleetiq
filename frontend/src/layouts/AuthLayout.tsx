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

          <p>Run your trucks, drivers and trips from one place.</p>

          <div className="auth-feature-list">
            <div>Live trip and checkpoint tracking</div>
            <div>Driver updates by SMS</div>
            <div>Truck, trailer and driver records</div>
          </div>
        </div>

        <div className="auth-form-panel">{children}</div>
      </div>
    </div>
  );
}
