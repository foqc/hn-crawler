/**
 * The entries source (Hacker News today) could not provide data. Defined by the application so
 * adapters can raise it and the HTTP layer can map it without knowing which source failed.
 */
export class SourceUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SourceUnavailableError';
  }
}
