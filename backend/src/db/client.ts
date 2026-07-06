import { Database } from "bun:sqlite";
import { config } from "../config";
import { applySchema } from "./schema";

export function createDb(path: string = config.dbPath): Database {
  const database = new Database(path);
  database.run("PRAGMA journal_mode = WAL;");
  applySchema(database);
  return database;
}

export const db = createDb();
