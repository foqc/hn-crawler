import { parseArgs } from 'node:util';
import type { EntriesService } from '../application/entriesService';
import { USAGE_LIMIT, type UsageService } from '../application/usageService';
import { FILTER_NAMES, type FilterName } from '../domain/filters';

export interface CliServices {
  readonly entriesService: EntriesService;
  readonly usageService: UsageService;
}

export interface CliOutput {
  out(line: string): void;
  err(line: string): void;
}

const COMMANDS: readonly (readonly [string, string])[] = [
  [`entries [--filter ${FILTER_NAMES.join('|')}]`, 'front page entries, optionally filtered'],
  [
    `usage [--limit ${USAGE_LIMIT.min}-${USAGE_LIMIT.max}]`,
    `usage log, most recent first (default ${USAGE_LIMIT.default})`,
  ],
  ['help', 'show this message'],
];

export const HELP = [
  'Usage: npm run cli -- <command> [options]',
  '',
  'Commands:',
  ...COMMANDS.map(([syntax, description]) => `  ${syntax.padEnd(46)}${description}`),
].join('\n');

type Command =
  | { readonly name: 'entries'; readonly filter?: FilterName }
  | { readonly name: 'usage'; readonly limit: number }
  | { readonly name: 'help' };

/** Wrong command line input: reported together with the help text. */
class InvalidArgumentsError extends Error {}

const parseFilter = (value: string | undefined): FilterName | undefined => {
  if (value === undefined) return undefined;
  const filter = FILTER_NAMES.find((name) => name === value);
  if (filter === undefined) {
    throw new InvalidArgumentsError(`--filter must be one of: ${FILTER_NAMES.join(', ')}`);
  }
  return filter;
};

const parseLimit = (value: string | undefined): number => {
  if (value === undefined) return USAGE_LIMIT.default;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < USAGE_LIMIT.min || limit > USAGE_LIMIT.max) {
    throw new InvalidArgumentsError(
      `--limit must be an integer between ${USAGE_LIMIT.min} and ${USAGE_LIMIT.max}`,
    );
  }
  return limit;
};

const parseCommand = (args: readonly string[]): Command => {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...args],
      allowPositionals: true,
      options: { filter: { type: 'string' }, limit: { type: 'string' }, help: { type: 'boolean' } },
    });
  } catch (error) {
    // parseArgs rejects unknown options or missing values with a readable message.
    throw new InvalidArgumentsError(error instanceof Error ? error.message : String(error));
  }

  const { positionals, values } = parsed;
  const [name, ...extra] = positionals;
  if (values.help || name === 'help') return { name: 'help' };
  if (extra.length > 0) throw new InvalidArgumentsError(`Unexpected argument "${extra[0]}"`);

  switch (name) {
    case 'entries':
      if (values.limit !== undefined)
        throw new InvalidArgumentsError('--limit is only for "usage"');
      return { name, filter: parseFilter(values.filter) };
    case 'usage':
      if (values.filter !== undefined) {
        throw new InvalidArgumentsError('--filter is only for "entries"');
      }
      return { name, limit: parseLimit(values.limit) };
    case undefined:
      throw new InvalidArgumentsError('Missing command');
    default:
      throw new InvalidArgumentsError(`Unknown command "${name}"`);
  }
};

const pluralize = (n: number, singular: string, plural = `${singular}s`): string =>
  `${n} ${n === 1 ? singular : plural}`;

/** Runs the command and returns the lines to print. */
const execute = async (command: Command, services: CliServices): Promise<string[]> => {
  switch (command.name) {
    case 'help':
      return [HELP];
    case 'entries': {
      const { filter, entries } = await services.entriesService.getEntries(command.filter);
      return [
        `${filter}: ${pluralize(entries.length, 'entry', 'entries')}`,
        ...entries.map(
          (e) =>
            `${String(e.rank).padStart(2)}. ${e.title} (${pluralize(e.points, 'point')}, ${pluralize(e.comments, 'comment')})`,
        ),
      ];
    }
    case 'usage': {
      const records = await services.usageService.getUsage(command.limit);
      return [
        pluralize(records.length, 'record'),
        ...records.map((r) =>
          [
            r.requestedAt,
            r.filter.padEnd(12),
            r.status.padEnd(7),
            pluralize(r.resultCount, 'result'),
            `${r.durationMs} ms`,
            r.cacheHit ? 'cache hit' : 'cache miss',
            r.errorMessage ?? '',
          ]
            .join('  ')
            .trimEnd(),
        ),
      ];
    }
  }
};

/**
 * Runs the CLI against the given services and returns the process exit code:
 * 0 on success, 1 when the command fails, 2 on invalid arguments.
 */
export const runCli = async (
  args: readonly string[],
  services: CliServices,
  output: CliOutput,
): Promise<number> => {
  try {
    const lines = await execute(parseCommand(args), services);
    lines.forEach((line) => output.out(line));
    return 0;
  } catch (error) {
    if (error instanceof InvalidArgumentsError) {
      output.err(`${error.message}\n\n${HELP}`);
      return 2;
    }
    output.err(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
};
