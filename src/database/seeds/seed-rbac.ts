import { DataSource } from 'typeorm';
import { SEED_ROLES } from '../../modules/auth/domain/constants/rbac.constants';

export const seedRbac = async (dataSource: DataSource): Promise<void> => {
  for (const roleName of SEED_ROLES) {
    await dataSource.query(
      `INSERT INTO roles (id, name, version, created_at, updated_at)
       SELECT uuid_generate_v4(), $1::text, 1, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = $1::text)`,
      [roleName],
    );
  }
};
