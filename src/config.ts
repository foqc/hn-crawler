export interface Config {
  readonly port: number;
  readonly host: string;
  readonly cacheTtlMs: number;
  readonly databasePath: string;
}

const MAX_PORT = 65_535;

const readInteger = (
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  max?: number,
): number => {
  const raw = env[name];
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(value) || value < 0 || value > (max ?? Infinity)) {
    const expected =
      max === undefined ? 'a non-negative integer' : `an integer between 0 and ${max}`;
    throw new Error(`${name} must be ${expected}, got "${raw}"`);
  }
  return value;
};

/** Reads the configuration from environment variables, failing fast on invalid values. */
export const loadConfig = (env: NodeJS.ProcessEnv): Config => ({
  port: readInteger(env, 'PORT', 3000, MAX_PORT),
  host: env.HOST ?? '127.0.0.1',
  cacheTtlMs: readInteger(env, 'CACHE_TTL_MS', 60_000),
  databasePath: env.DATABASE_PATH ?? 'usage.db',
});
