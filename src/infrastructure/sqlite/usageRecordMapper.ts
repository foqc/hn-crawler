import type { SQLInputValue, SQLOutputValue } from 'node:sqlite';
import {
  APPLIED_FILTERS,
  REQUEST_STATUSES,
  type StoredUsageRecord,
  type UsageRecord,
} from '../../domain/usage';

type Row = Record<string, SQLOutputValue>;

// Rows come from outside the type system, so every column is checked. Invalid data fails loudly
// instead of being replaced by a default that would hide corruption.
const invalid = (column: string, value: SQLOutputValue): Error =>
  new Error(`Invalid usage_logs.${column}: ${String(value)}`);

const text = (row: Row, column: string): string => {
  const value = row[column];
  if (typeof value !== 'string') throw invalid(column, value);
  return value;
};

const nullableText = (row: Row, column: string): string | null =>
  row[column] === null ? null : text(row, column);

const numeric = (row: Row, column: string): number => {
  const value = row[column];
  if (typeof value !== 'number') throw invalid(column, value);
  return value;
};

const oneOf = <T extends string>(row: Row, column: string, allowed: readonly T[]): T => {
  const value = row[column];
  const match = allowed.find((option) => option === value);
  if (match === undefined) throw invalid(column, value);
  return match;
};

/** Domain record -> named parameters of the INSERT statement. */
export const toParams = (record: UsageRecord): Record<string, SQLInputValue> => ({
  ...record,
  cacheHit: record.cacheHit ? 1 : 0,
});

/** usage_logs row -> domain record. Throws when a column holds an unexpected value. */
export const fromRow = (row: Row): StoredUsageRecord => ({
  id: numeric(row, 'id'),
  requestedAt: text(row, 'requested_at'),
  filter: oneOf(row, 'filter', APPLIED_FILTERS),
  status: oneOf(row, 'status', REQUEST_STATUSES),
  resultCount: numeric(row, 'result_count'),
  durationMs: numeric(row, 'duration_ms'),
  cacheHit: numeric(row, 'cache_hit') === 1,
  errorMessage: nullableText(row, 'error_message'),
});
