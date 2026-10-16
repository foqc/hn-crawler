export interface Config {
  readonly port: number;
  readonly host: string;
  readonly cacheTtlMs: number;
  readonly databasePath: string;
}

const readNonNegativeInteger = (env: NodeJS.ProcessEnv, name: string, fallback: number): number => {
  const raw = env[name];
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer, got "${raw}"`);
  }
  return value;
};

/** Reads the configuration from environment variables, failing fast on invalid values. */
export const loadConfig = (env: NodeJS.ProcessEnv): Config => ({
  port: readNonNegativeInteger(env, 'PORT', 3000),
  host: env.HOST ?? '127.0.0.1',
  cacheTtlMs: readNonNegativeInteger(env, 'CACHE_TTL_MS', 60_000),
  databasePath: env.DATABASE_PATH ?? 'usage.db',
});
