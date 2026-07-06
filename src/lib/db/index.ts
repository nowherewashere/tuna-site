import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Lazy singleton — defer the DB connection (and env validation) to first use at
// runtime, so `next build` never needs DATABASE_URL. Reuse across HMR reloads.
const globalForDb = globalThis as unknown as {
  __sql?: ReturnType<typeof postgres>;
  __db?: Db;
};

export function getDb(): Db {
  if (globalForDb.__db) return globalForDb.__db;
  const sql = globalForDb.__sql ?? postgres(env().DATABASE_URL, { max: 10 });
  const db = drizzle(sql, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__sql = sql;
    globalForDb.__db = db;
  }
  return db;
}

export { schema };
