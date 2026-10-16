import { TtlCache } from '../../../src/infrastructure/cache/ttlCache';

const TTL_MS = 1_000;

const setup = () => {
  let time = 0;
  const cache = new TtlCache<string>(TTL_MS, () => time);
  const advance = (ms: number): void => {
    time += ms;
  };
  return { cache, advance };
};

describe('TtlCache', () => {
  it('loads on the first call and reports a miss', async () => {
    const { cache } = setup();
    const load = jest.fn().mockResolvedValue('value');

    await expect(cache.get(load)).resolves.toEqual({ value: 'value', hit: false });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('serves the cached value within the TTL and reports a hit', async () => {
    const { cache, advance } = setup();
    const load = jest.fn().mockResolvedValue('value');

    await cache.get(load);
    advance(TTL_MS - 1);

    await expect(cache.get(load)).resolves.toEqual({ value: 'value', hit: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads once the TTL has expired', async () => {
    const { cache, advance } = setup();
    const load = jest.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new');

    await cache.get(load);
    advance(TTL_MS);

    await expect(cache.get(load)).resolves.toEqual({ value: 'new', hit: false });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares a single in-flight load between concurrent callers', async () => {
    const { cache } = setup();
    const load = jest.fn().mockResolvedValue('value');

    const results = await Promise.all([cache.get(load), cache.get(load), cache.get(load)]);

    expect(load).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.value)).toEqual(['value', 'value', 'value']);
  });

  it('does not cache failures', async () => {
    const { cache } = setup();
    const load = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('value');

    await expect(cache.get(load)).rejects.toThrow('boom');
    await expect(cache.get(load)).resolves.toEqual({ value: 'value', hit: false });
  });
});
