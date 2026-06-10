import dataSource from '../data-source';
import { seedRbac } from './seed-rbac';

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    await seedRbac(dataSource);
    console.log('RBAC seed completed (roles: user, admin)');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error: unknown) => {
  console.error('RBAC seed failed:', error);
  process.exit(1);
});
