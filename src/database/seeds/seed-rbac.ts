import { DataSource } from 'typeorm';
import {
  RBAC_PERMISSIONS,
  ROLE_PERMISSIONS,
  SEED_ROLES,
} from '../../modules/auth/domain/constants/rbac.constants';

export const seedRbac = async (dataSource: DataSource): Promise<void> => {
  for (const roleName of SEED_ROLES) {
    await dataSource.query(
      `INSERT INTO roles (id, name, version, created_at, updated_at)
       SELECT uuid_generate_v4(), $1::text, 1, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = $1::text)`,
      [roleName],
    );
  }

  for (const permissionName of Object.values(RBAC_PERMISSIONS)) {
    await dataSource.query(
      `INSERT INTO permissions (id, name, version, created_at, updated_at)
       SELECT uuid_generate_v4(), $1::text, 1, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = $1::text)`,
      [permissionName],
    );
  }

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permissionName of permissionNames) {
      await dataSource.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r, permissions p
         WHERE r.name = $1::text AND p.name = $2::text
         AND NOT EXISTS (
           SELECT 1 FROM role_permissions rp
           WHERE rp.role_id = r.id AND rp.permission_id = p.id
         )`,
        [roleName, permissionName],
      );
    }
  }
};
