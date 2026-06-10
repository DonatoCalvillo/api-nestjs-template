import { DataSource } from 'typeorm';

const TABLES = [
  'idempotency_keys',
  'outbox_messages',
  'refresh_tokens',
  'user_roles',
  'role_permissions',
  'users',
  'roles',
  'permissions',
  'audit_logs',
];

export const truncateTables = async (dataSource: DataSource): Promise<void> => {
  const tableList = TABLES.map((table) => `"${table}"`).join(', ');
  await dataSource.query(
    `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`,
  );
};
