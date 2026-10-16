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
  const reportError = jest.fn<void, [unknown]>();
  const service = new UsageService({ save, list }, now, reportError);
  return { service, now, advance, save, list, reportError };
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

  it('reports a failed save instead of throwing it', async () => {
    const { service, save, reportError } = setup();
    const error = new Error('disk full');
    save.mockRejectedValueOnce(error);

    await expect(
      service.record('none', 0, {
        status: 'success',
        resultCount: 0,
        cacheHit: false,
        errorMessage: null,
      }),
    ).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(error);
  });

  it('reads the usage log from the repository', async () => {
    const { service, list } = setup();

    await expect(service.getUsage(5)).resolves.toEqual([]);
    expect(list).toHaveBeenCalledWith(5);
  });
});
