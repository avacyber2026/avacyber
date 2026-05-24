-- Multi-tenancy: add tenant_id to users
-- NULL = AVA Cyber superadmin (sees everything)
-- 'privateum' = Privateum client (sees only their data)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id) WHERE tenant_id IS NOT NULL;
