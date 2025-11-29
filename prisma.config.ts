import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

// Load environment variables from .env file only in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL || "",
  },
});
