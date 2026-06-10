import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApiKey1781117545360 implements MigrationInterface {
  name = 'ApiKey1781117545360';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auth_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "user_id" uuid NOT NULL, "type" character varying NOT NULL, "token_hash" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "name" character varying NOT NULL, "key_prefix" character varying NOT NULL, "key_hash" character varying NOT NULL, "scopes" text array NOT NULL DEFAULT '{}', "expires_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_identities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL, "user_id" uuid NOT NULL, "provider" character varying NOT NULL, "provider_sub" character varying NOT NULL, "email" character varying, CONSTRAINT "PK_e23bff04e9c3e7b785e442b262c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_verified_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "mfa_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "totp_secret_encrypted" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "mfa_pending_secret_encrypted" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "mfa_pending_secret_encrypted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "totp_secret_encrypted"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "mfa_enabled"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_verified_at"`,
    );
    await queryRunner.query(`DROP TABLE "user_identities"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP TABLE "auth_tokens"`);
  }
}
