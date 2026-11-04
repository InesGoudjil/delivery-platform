export type LogLevelNumber = 10 | 20 | 30 | 40 | 50 | 60;

export interface ExternalLogEntry {
  level: LogLevelNumber;
  levelName: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  data: Record<string, unknown>;
  error?: Error;
  timestamp: string;
}

export type ExternalLogHandler = (entry: ExternalLogEntry) => void | Promise<void>;

const externalHandlers: Set<ExternalLogHandler> = new Set();

/**
 * Registers an external aggregator / error reporting handler.
 * Errors thrown by handlers are caught to guarantee logger execution is non-fatal.
 */
export function registerExternalLogHandler(handler: ExternalLogHandler): () => void {
  externalHandlers.add(handler);
  return () => {
    externalHandlers.delete(handler);
  };
}

const LEVEL_NAMES: Record<LogLevelNumber, ExternalLogEntry['levelName']> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

/**
 * Dispatches a log entry to all registered external handlers asynchronously.
 */
export function dispatchExternalLog(
  level: number,
  args: [Record<string, unknown>, string?] | [string] | unknown[]
): void {
  if (externalHandlers.size === 0) return;

  const levelNum = (level in LEVEL_NAMES ? level : 30) as LogLevelNumber;
  const levelName = LEVEL_NAMES[levelNum];

  let message = '';
  let data: Record<string, unknown> = {};
  let error: Error | undefined;

  if (typeof args[0] === 'string') {
    message = args[0];
  } else if (typeof args[0] === 'object' && args[0] !== null) {
    data = { ...(args[0] as Record<string, unknown>) };
    if (typeof args[1] === 'string') {
      message = args[1];
    }
    if (data.err instanceof Error) {
      error = data.err;
    } else if (data.error instanceof Error) {
      error = data.error;
    }
  }

  const entry: ExternalLogEntry = {
    level: levelNum,
    levelName,
    message,
    data,
    error,
    timestamp: new Date().toISOString(),
  };

  // Run asynchronously without awaiting to keep logging non-blocking
  queueMicrotask(() => {
    for (const handler of externalHandlers) {
      try {
        const result = handler(entry);
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => {
            // Silently absorb external aggregation failures
          });
        }
      } catch {
        // Silently absorb synchronous handler failures
      }
    }
  });
}
