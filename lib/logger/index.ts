import type { Logger, LoggerOptions } from 'pino';
import { getLogContext } from './context';
import { dispatchExternalLog } from './external';

const isProduction = process.env.NODE_ENV === 'production';
const defaultLogLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

function createBrowserLogger(bindings: Record<string, unknown> = {}): Logger {
  const format = (args: any[]) => {
    if (Object.keys(bindings).length > 0) {
      return [`[${Object.entries(bindings).map(([k, v]) => `${k}=${v}`).join(' ')}]`, ...args];
    }
    return args;
  };

  const browserLog = {
    level: defaultLogLevel,
    trace: (...args: any[]) => console.debug(...format(args)),
    debug: (...args: any[]) => console.debug(...format(args)),
    info: (...args: any[]) => console.info(...format(args)),
    warn: (...args: any[]) => console.warn(...format(args)),
    error: (...args: any[]) => {
      dispatchExternalLog(50, args);
      console.error(...format(args));
    },
    fatal: (...args: any[]) => {
      dispatchExternalLog(60, args);
      console.error(...format(args));
    },
    child: (childBindings: Record<string, unknown>) =>
      createBrowserLogger({ ...bindings, ...childBindings }),
  } as unknown as Logger;

  return browserLog;
}

function createServerLogger(): Logger {
  try {
    // Dynamic require prevents Next.js / Turbopack browser bundlers from attempting to bundle Node built-ins
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const req = eval('require');
    const pino = req('pino');

    let devStream: any = undefined;
    if (!isProduction) {
      try {
        const pretty = req('pino-pretty');
        devStream = pretty({
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        });
      } catch {
        devStream = undefined;
      }
    }

    const options: LoggerOptions = {
      level: defaultLogLevel,
      mixin() {
        return getLogContext() || {};
      },
      redact: {
        paths: [
          'password',
          'secret',
          'token',
          '*.password',
          '*.secret',
          '*.token',
          'authorization',
          'cookie',
          'req.headers.authorization',
          'req.headers.cookie',
          'apiKey',
          'api_key',
          'service_role_key',
        ],
        censor: '[REDACTED]',
      },
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
      },
      hooks: {
        logMethod(inputArgs: any[], method: any, level: number) {
          if (level >= 50) {
            dispatchExternalLog(level, inputArgs);
          }
          return method.apply(this, inputArgs);
        },
      },
    };

    return devStream ? pino(options, devStream) : pino(options);
  } catch {
    return createBrowserLogger();
  }
}

export const logger: Logger =
  typeof window === 'undefined' ? createServerLogger() : createBrowserLogger();

/**
 * Creates a scoped child logger with permanent contextual properties (e.g. service or module name).
 */
export function createScopedLogger(context: { [key: string]: unknown }): Logger {
  return logger.child(context);
}

// Re-exports
export * from './context';
export * from './external';
export * from './transports/posthog';
export type { Logger } from 'pino';
