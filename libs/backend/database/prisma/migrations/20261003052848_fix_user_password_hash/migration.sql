/*
  Fix typo in the original erp_core migration: the column was created as
  `passwordHad` while the schema (and Prisma client) use `passwordHash`.
  Renamed instead of drop/add so existing data is preserved.
*/
-- AlterTable
ALTER TABLE "User" RENAME COLUMN "passwordHad" TO "passwordHash";
