import type { FastifyPluginCallback } from 'fastify';
import type { EntriesService } from '../../application/entriesService';
import { FILTER_NAMES, type FilterName } from '../../domain/filters';

const entrySchema = {
  type: 'object',
  properties: {
    rank: { type: 'integer' },
    title: { type: 'string' },
    points: { type: 'integer' },
    comments: { type: 'integer' },
  },
  required: ['rank', 'title', 'points', 'comments'],
} as const;

// Fastify validates the query (unknown filter -> 400) and serializes the response from the schema.
const schema = {
  querystring: {
    type: 'object',
    properties: { filter: { type: 'string', enum: FILTER_NAMES } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        filter: { type: 'string' },
        count: { type: 'integer' },
        entries: { type: 'array', items: entrySchema },
      },
      required: ['filter', 'count', 'entries'],
    },
  },
} as const;

/** GET /entries: the front page entries, optionally filtered. */
export const entriesRoutes: FastifyPluginCallback<{ entriesService: EntriesService }> = (
  app,
  { entriesService },
  done,
) => {
  app.get<{ Querystring: { filter?: FilterName } }>('/entries', { schema }, async (request) => {
    const { filter, entries } = await entriesService.getEntries(request.query.filter);
    return { filter, count: entries.length, entries };
  });
  done();
};
