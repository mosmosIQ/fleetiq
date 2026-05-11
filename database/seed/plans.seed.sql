INSERT INTO subscription_plans
(name, truck_limit, driver_limit, company_admin_limit, sms_monthly_limit, whatsapp_monthly_limit)
VALUES
('STANDARD', 25, 25, 3, 2000, 500),
('PREMIUM', 100, 100, 10, 10000, 2000)
ON CONFLICT (name) DO NOTHING;
