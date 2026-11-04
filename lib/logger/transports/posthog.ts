import { registerExternalLogHandler, ExternalLogEntry } from '../external';
import { captureServerEvent } from '@/lib/posthog/server';

/**
 * Connects logger errors and fatal events to PostHog as an application error event.
 */
export function enablePostHogLogForwarding(): () => void {
  return registerExternalLogHandler((entry: ExternalLogEntry) => {
    // Forward error and fatal logs
    if (entry.level >= 50) {
      const distinctId =
        (typeof entry.data.userId === 'string' && entry.data.userId) ||
        (typeof entry.data.workspaceId === 'string' && entry.data.workspaceId) ||
        'system';

      captureServerEvent({
        distinctId,
        event: 'application_error',
        properties: {
          level: entry.levelName,
          message: entry.message,
          error_name: entry.error?.name,
          error_message: entry.error?.message,
          error_stack: entry.error?.stack,
          timestamp: entry.timestamp,
          ...entry.data,
        },
      });
    }
  });
}
