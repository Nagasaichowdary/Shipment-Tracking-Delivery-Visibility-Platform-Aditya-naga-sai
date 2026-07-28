-- ─────────────────────────────────────────────────────────────────────────────
-- data.sql  — Application seed data (runs on every startup when ddl-auto=create
--             or explicitly via spring.sql.init.mode=always)
--
-- Admin user: admin@shiptrack.com / admin123
-- BCrypt hash generated with BCryptPasswordEncoder (strength 10).
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed the default Admin user only if it does not already exist.
INSERT INTO users (first_name, last_name, email, password_hash, phone, role_id, registration_status, is_active)
SELECT 'Admin', 'User', 'admin@shiptrack.com',
       '$2a$10$L7tVfxJczVGLCbJE7.ZzLe4BER0XBMjLKp6Q6WCbbrjcMi2ysoYyS',
       NULL, 1, 'APPROVED', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@shiptrack.com');
