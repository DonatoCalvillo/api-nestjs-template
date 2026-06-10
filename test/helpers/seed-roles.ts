import { DataSource } from 'typeorm';

export const seedUserRole = async (dataSource: DataSource): Promise<void> => {
  await dataSource.query(
    `INSERT INTO roles (id, name, version, created_at, updated_at)
     SELECT uuid_generate_v4(), 'user', 1, NOW(), NOW()
     WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user')`,
  );
};
