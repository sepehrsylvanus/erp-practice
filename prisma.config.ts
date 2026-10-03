import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "libs/backend/database/prisma/schema.prisma",
  migrations: {
    path: "libs/backend/database/prisma/migrations",
    seed: "tsx libs/backend/database/prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
