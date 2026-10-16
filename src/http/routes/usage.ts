import type { FastifyPluginCallback } from 'fastify';
import type { UsageService } from '../../application/usageService';

const usageRecordSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    requestedAt: { type: 'string' },
    filter: { type: 'string' },
    status: { type: 'string' },
    resultCount: { type: 'integer' },
    durationMs: { type: 'number' },
    cacheHit: { type: 'boolean' },
    errorMessage: { type: ['string', 'null'] },
  },
} as const;

// Fastify validates the query (limit out of range -> 400) and serializes the response from the schema.
const schema = {
  querystring: {
    type: 'object',
    properties: { limit: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        count: { type: 'integer' },
        records: { type: 'array', items: usageRecordSchema },
      },
    },
  },
} as const;

/** GET /usage: the usage log, most recent first. */
export const usageRoutes: FastifyPluginCallback<{ usageService: UsageService }> = (
  app,
  { usageService },
  done,
) => {
  app.get<{ Querystring: { limit: number } }>('/usage', { schema }, async (request) => {
    const records = await usageService.getUsage(request.query.limit);
    return { count: records.length, records };
  });
  done();
};
