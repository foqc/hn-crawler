import { createContainer } from '../src/container';

describe('createContainer', () => {
  it('wires a working service on a migrated database', async () => {
    const container = createContainer({
      port: 0,
      host: '127.0.0.1',
      cacheTtlMs: 0,
      databasePath: ':memory:',
    });

    await expect(container.entriesService.getUsage(10)).resolves.toEqual([]);
    container.close();
  });
});
