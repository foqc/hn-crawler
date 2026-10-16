import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { EntriesService } from '../application/entriesService';
import { SourceUnavailableError } from '../application/errors';
import type { UsageService } from '../application/usageService';
import { entriesRoutes } from './routes/entries';
import { usageRoutes } from './routes/usage';

export interface AppServices {
  readonly entriesService: EntriesService;
  readonly usageService: UsageService;
}

/** Builds the HTTP app without listening, so tests can drive it with `app.inject()`. */
export const buildApp = (
  { entriesService, usageService }: AppServices,
  options: FastifyServerOptions = {},
): FastifyInstance => {
  const app = Fastify(options);

  // Set before registering the routes so every route plugin inherits it.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof SourceUnavailableError) {
      request.log.warn({ err: error }, 'Entries source is unavailable');
      return reply
        .code(502)
        .send({ statusCode: 502, error: 'Bad Gateway', message: error.message });
    }
    // Anything else (validation errors included) goes to Fastify's default handler.
    return reply.send(error);
  });

  void app.register(entriesRoutes, { entriesService });
  void app.register(usageRoutes, { usageService });

  return app;
};
