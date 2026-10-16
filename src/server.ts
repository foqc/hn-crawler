import { loadConfig } from './config';
import { createContainer } from './container';
import { buildApp } from './http/app';

const main = async (): Promise<void> => {
  const config = loadConfig(process.env);
  const container = createContainer(config);
  const app = buildApp(container.entriesService, { logger: true });

  const shutdown = async (): Promise<void> => {
    await app.close();
    container.close();
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => void shutdown());
  }

  await app.listen({ port: config.port, host: config.host });
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
