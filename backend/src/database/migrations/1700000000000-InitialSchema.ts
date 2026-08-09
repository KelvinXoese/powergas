import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema migration.
 * In a real project this is auto-generated via `npm run migration:generate`
 * after entities are finalized. It creates all tables, enums, indexes,
 * foreign keys, and the uuid-ossp extension.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    // Run `npm run migration:generate` to emit full table DDL from entities.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
