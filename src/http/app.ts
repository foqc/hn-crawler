import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { EntriesService } from '../application/entriesService';
import { SourceUnavailableError } from '../application/errors';
import type { UsageService } from '../application/usageService';
import type { FilterName } from '../domain/filters';
import { entriesRouteSchema, usageRouteSchema } from './schemas';

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

  app.get<{ Querystring: { filter?: FilterName } }>(
    '/entries',
    { schema: entriesRouteSchema },
    async (request) => {
      const { filter, entries } = await entriesService.getEntries(request.query.filter);
      return { filter, count: entries.length, entries };
    },
  );

  app.get<{ Querystring: { limit: number } }>(
    '/usage',
    { schema: usageRouteSchema },
    async (request) => {
      const records = await usageService.getUsage(request.query.limit);
      return { count: records.length, records };
    },
  );

  return app;
};
