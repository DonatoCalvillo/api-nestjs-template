import { DataSource } from 'typeorm';

export const assignUserRole = async (
  dataSource: DataSource,
  userId: string,
  roleName: string,
): Promise<void> => {
  const role = await dataSource.query<{ id: string }[]>(
    `SELECT id FROM roles WHERE name = $1 LIMIT 1`,
    [roleName],
  );

  if (!role.length) {
    throw new Error(`Role not found: ${roleName}`);
  }

  await dataSource.query(
    `INSERT INTO user_roles (user_id, role_id)
     VALUES ($1::uuid, $2::uuid)
     ON CONFLICT DO NOTHING`,
    [userId, role[0].id],
  );
};
