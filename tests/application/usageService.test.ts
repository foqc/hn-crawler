import type { UsageRepository } from '../../src/application/ports';
import { UsageService } from '../../src/application/usageService';
import type { UsageRecord } from '../../src/domain/usage';

const setup = () => {
  let time = Date.parse('2026-10-16T12:00:00.000Z');
  const now = (): number => time;
  const advance = (ms: number): void => {
    time += ms;
  };
  const save = jest.fn<Promise<void>, [UsageRecord]>().mockResolvedValue();
  const list = jest.fn<ReturnType<UsageRepository['list']>, [number]>().mockResolvedValue([]);
  const service = new UsageService({ save, list }, now);
  return { service, now, advance, save, list };
};

describe('UsageService', () => {
  it('records a request with its start time and the duration up to now', async () => {
    const { service, now, advance, save } = setup();
    const startedAt = now();
    advance(250);

    await service.record('long-titles', startedAt, {
      status: 'success',
      resultCount: 4,
      cacheHit: true,
      errorMessage: null,
    });

    expect(save).toHaveBeenCalledWith({
      requestedAt: '2026-10-16T12:00:00.000Z',
      filter: 'long-titles',
      durationMs: 250,
      status: 'success',
      resultCount: 4,
      cacheHit: true,
      errorMessage: null,
    });
  });

  it('reads the usage log from the repository', async () => {
    const { service, list } = setup();

    await expect(service.getUsage(5)).resolves.toEqual([]);
    expect(list).toHaveBeenCalledWith(5);
  });
});
