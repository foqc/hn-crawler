import { TtlCache } from '../../../src/infrastructure/cache/ttlCache';

const TTL_MS = 1_000;

const setup = (ttlMs = TTL_MS) => {
  let time = 0;
  const cache = new TtlCache<string>(ttlMs, () => time);
  const advance = (ms: number): void => {
    time += ms;
  };
  return { cache, advance };
};

describe('TtlCache', () => {
  it('is empty until a value is set', async () => {
    const { cache } = setup();

    await expect(cache.get()).resolves.toBeUndefined();
  });

  it('returns the value within the TTL', async () => {
    const { cache, advance } = setup();

    await cache.set('value');
    advance(TTL_MS - 1);

    await expect(cache.get()).resolves.toBe('value');
  });

  it('expires the value once the TTL has elapsed', async () => {
    const { cache, advance } = setup();

    await cache.set('value');
    advance(TTL_MS);

    await expect(cache.get()).resolves.toBeUndefined();
  });

  it('restarts the TTL when a new value is set', async () => {
    const { cache, advance } = setup();

    await cache.set('old');
    advance(TTL_MS - 1);
    await cache.set('new');
    advance(TTL_MS - 1);

    await expect(cache.get()).resolves.toBe('new');
  });

  it('never keeps a value when the TTL is 0', async () => {
    const { cache } = setup(0);

    await cache.set('value');

    await expect(cache.get()).resolves.toBeUndefined();
  });
});
