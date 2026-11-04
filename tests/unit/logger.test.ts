import { describe, it, expect, vi } from 'vitest';
import pino from 'pino';
import {
  getLogContext,
  runWithLogContext,
  withLogContext,
} from '@/lib/logger/context';
import {
  registerExternalLogHandler,
  dispatchExternalLog,
  ExternalLogEntry,
} from '@/lib/logger/external';
import { createScopedLogger, logger } from '@/lib/logger';

describe('Logger Module', () => {
  it('exports a valid pino logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('creates scoped child loggers with context', () => {
    const scoped = createScopedLogger({ service: 'TestService', version: '1.0' });
    expect(scoped).toBeDefined();
    expect(typeof scoped.info).toBe('function');
  });

  describe('Context (AsyncLocalStorage)', () => {
    it('propagates context using runWithLogContext', () => {
      expect(getLogContext()).toBeUndefined();

      runWithLogContext({ requestId: 'req-123', workspaceId: 'ws-456' }, () => {
        const ctx = getLogContext();
        expect(ctx?.requestId).toBe('req-123');
        expect(ctx?.workspaceId).toBe('ws-456');

        // Nested context inheritance
        runWithLogContext({ userId: 'user-789' }, () => {
          const nested = getLogContext();
          expect(nested?.requestId).toBe('req-123');
          expect(nested?.workspaceId).toBe('ws-456');
          expect(nested?.userId).toBe('user-789');
        });

        // Restores after nested
        expect(getLogContext()?.userId).toBeUndefined();
      });

      expect(getLogContext()).toBeUndefined();
    });

    it('wraps async functions with withLogContext', async () => {
      const action = withLogContext(
        { action: 'testAction', requestId: 'req-wrap' },
        async (num: number) => {
          const ctx = getLogContext();
          return { ctx, result: num * 2 };
        }
      );

      const res = await action(5);
      expect(res.result).toBe(10);
      expect(res.ctx?.action).toBe('testAction');
      expect(res.ctx?.requestId).toBe('req-wrap');
    });

    it('supports dynamic context resolvers with withLogContext', async () => {
      const action = withLogContext(
        (slug: string) => ({ workspaceSlug: slug }),
        async (slug: string) => {
          return getLogContext();
        }
      );

      const ctx = await action('my-workspace');
      expect(ctx?.workspaceSlug).toBe('my-workspace');
    });
  });

  describe('External Aggregator Dispatch', () => {
    it('calls registered external handlers when errors occur', async () => {
      const recorded: ExternalLogEntry[] = [];
      const unregister = registerExternalLogHandler((entry) => {
        recorded.push(entry);
      });

      const testError = new Error('Database connection failed');
      dispatchExternalLog(50, [{ err: testError, query: 'SELECT 1' }, 'Query failure']);

      // Microtask execution
      await new Promise((r) => setTimeout(r, 10));

      expect(recorded.length).toBe(1);
      expect(recorded[0].levelName).toBe('error');
      expect(recorded[0].message).toBe('Query failure');
      expect(recorded[0].error?.message).toBe('Database connection failed');

      unregister();

      // Dispatch again after unregister
      dispatchExternalLog(50, ['Another error']);
      await new Promise((r) => setTimeout(r, 10));
      expect(recorded.length).toBe(1);
    });
  });
});
