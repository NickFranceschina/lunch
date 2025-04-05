import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimezoneToGroup1743858757948 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group" ADD "timezone" varchar`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "timezone"`);
    }

}
