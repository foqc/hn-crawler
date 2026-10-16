import type { UsageRepository } from '../../src/application/ports';
import { UsageService } from '../../src/application/usageService';

describe('UsageService', () => {
  it('reads the usage log from the repository', async () => {
    const list = jest.fn<ReturnType<UsageRepository['list']>, [number]>().mockResolvedValue([]);
    const service = new UsageService({ save: () => Promise.resolve(), list });

    await expect(service.getUsage(5)).resolves.toEqual([]);
    expect(list).toHaveBeenCalledWith(5);
  });
});
