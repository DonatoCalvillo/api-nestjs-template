import { MigrationInterface, QueryRunner } from 'typeorm';

export class IdempotencyKey1781072486151 implements MigrationInterface {
  name = 'IdempotencyKey1781072486151';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "scope" character varying NOT NULL, "idempotency_key" character varying NOT NULL, "request_method" character varying NOT NULL, "request_path" character varying NOT NULL, "request_hash" character varying(64) NOT NULL, "response_status" integer, "response_body" jsonb, "status" character varying NOT NULL DEFAULT 'in_progress', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_idempotency_scope_key" UNIQUE ("scope", "idempotency_key"), CONSTRAINT "PK_8ad20779ad0411107a56e53d0f6" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
