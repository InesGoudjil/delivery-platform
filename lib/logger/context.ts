export interface LogContext {
  requestId?: string;
  workspaceId?: string;
  workspaceSlug?: string;
  userId?: string;
  action?: string;
  service?: string;
  [key: string]: unknown;
}

// Safely instantiate AsyncLocalStorage without triggering client bundle errors
let storage: any = null;
if (typeof window === 'undefined') {
  try {
    // Dynamic require so browser/turbopack bundlers do not attempt to resolve async_hooks
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const req = eval('require');
    const { AsyncLocalStorage } = req('async_hooks');
    storage = new AsyncLocalStorage();
  } catch {
    // Falls back to null in runtimes without AsyncLocalStorage support
  }
}

/**
 * Runs a function within the specified log context.
 * Any loggers using the mixin inside this async execution scope
 * will automatically attach this context to their log outputs.
 */
export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  if (!storage) {
    return fn();
  }
  const current = storage.getStore() || {};
  return storage.run({ ...current, ...context }, fn);
}

/**
 * Higher-order function wrapper to attach log context to an async function (e.g. Server Actions).
 */
export function withLogContext<Args extends unknown[], Return>(
  context: LogContext | ((...args: Args) => LogContext),
  fn: (...args: Args) => Promise<Return>
): (...args: Args) => Promise<Return> {
  return async (...args: Args) => {
    const resolvedContext = typeof context === 'function' ? context(...args) : context;
    return runWithLogContext(resolvedContext, () => fn(...args));
  };
}

/**
 * Retrieves the active log context from AsyncLocalStorage.
 */
export function getLogContext(): LogContext | undefined {
  return storage?.getStore();
}
