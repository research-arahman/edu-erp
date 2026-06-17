-- Add the permission-tier roles to user_role.
-- 'owner','manager','counselor','student' already exist from the enums migration.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'team_leader';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';