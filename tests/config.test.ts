import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('uses defaults when no variable is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      host: '127.0.0.1',
      cacheTtlMs: 60_000,
      databasePath: 'usage.db',
    });
  });

  it('reads every value from the environment', () => {
    const env = { PORT: '8080', HOST: '0.0.0.0', CACHE_TTL_MS: '0', DATABASE_PATH: '/tmp/u.db' };

    expect(loadConfig(env)).toEqual({
      port: 8080,
      host: '0.0.0.0',
      cacheTtlMs: 0,
      databasePath: '/tmp/u.db',
    });
  });

  test.each(['abc', '-1', '1.5', '', '65536'])('rejects %p as a port', (value) => {
    expect(() => loadConfig({ PORT: value })).toThrow(
      'PORT must be an integer between 0 and 65535',
    );
  });

  test.each(['abc', '-1'])('rejects %p as a cache TTL', (value) => {
    expect(() => loadConfig({ CACHE_TTL_MS: value })).toThrow(
      'CACHE_TTL_MS must be a non-negative integer',
    );
  });
});
