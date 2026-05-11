-- Replace password_hash with a real bcrypt hash before use.
INSERT INTO users (tenant_id, full_name, email, password_hash, role, is_active)
VALUES (NULL, 'SaaS Owner', 'admin@example.com', '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'SUPER_ADMIN', true)
ON CONFLICT (email) DO NOTHING;
