export const config = {
  port: Number(process.env.PORT ?? 3000),
  dbPath: process.env.DB_PATH ?? "nkyc.db",
  pbkdf2Iterations: 100_000,
  saltBytes: 16,
  hashBytes: 32,
  sessionTtlMs: 24 * 60 * 60 * 1000,
};
