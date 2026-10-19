import { isSqlDestructive } from './check-destructive-migrations';

describe('check-destructive-migrations', () => {
  it('deve aprovar SQL seguro com CREATE TABLE e ALTER TABLE ADD COLUMN', () => {
    const safeSql = `
      CREATE TABLE "users" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        PRIMARY KEY ("id")
      );
      ALTER TABLE "users" ADD COLUMN "email" TEXT;
    `;
    const result = isSqlDestructive(safeSql);
    expect(result.isDestructive).toBe(false);
    expect(result.matchedKeywords).toHaveLength(0);
  });

  it('deve reprovar SQL destrutivo com DROP TABLE', () => {
    const destructiveSql = `
      DROP TABLE "users";
    `;
    const result = isSqlDestructive(destructiveSql);
    expect(result.isDestructive).toBe(true);
  });

  it('deve reprovar SQL destrutivo com DROP COLUMN', () => {
    const destructiveSql = `
      ALTER TABLE "users" DROP COLUMN "email";
    `;
    const result = isSqlDestructive(destructiveSql);
    expect(result.isDestructive).toBe(true);
  });

  it('deve reprovar SQL destrutivo com TRUNCATE', () => {
    const destructiveSql = `
      TRUNCATE TABLE "users";
    `;
    const result = isSqlDestructive(destructiveSql);
    expect(result.isDestructive).toBe(true);
  });
});
