import { FILTER_NAMES } from '../domain/filters';

// JSON Schemas let Fastify validate input (invalid filter -> 400) and serialize responses faster.

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

export const entriesRouteSchema = {
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
    },
  },
} as const;

export const usageRouteSchema = {
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
