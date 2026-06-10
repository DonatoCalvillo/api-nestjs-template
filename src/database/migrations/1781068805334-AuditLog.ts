import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLog1781068805334 implements MigrationInterface {
  name = 'AuditLog1781068805334';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "actor_id" character varying, "actor_type" character varying NOT NULL, "action" character varying NOT NULL, "entity_type" character varying NOT NULL, "entity_id" character varying, "before_state" jsonb, "after_state" jsonb, "changes" jsonb, "request_id" character varying, "trace_id" character varying, "ip_address" character varying, "use_case_name" character varying NOT NULL, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
