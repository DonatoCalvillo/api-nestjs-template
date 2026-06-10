import { MigrationInterface, QueryRunner } from 'typeorm';

export class OutboxClaimAndRefreshToken1781112870409 implements MigrationInterface {
  name = 'OutboxClaimAndRefreshToken1781112870409';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "outbox_messages" ADD "claimed_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "outbox_messages" DROP COLUMN "claimed_at"`,
    );
  }
}
