import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { config } from "../config";
import * as schema from "./schema";

export function createDb(path: string = config.dbPath): BunSQLiteDatabase<typeof schema> {
  const sqlite = new Database(path);
  sqlite.run("PRAGMA journal_mode = WAL;");
  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: "./drizzle" });
  return database;
}

export const db = createDb();
export type Db = ReturnType<typeof createDb>;
