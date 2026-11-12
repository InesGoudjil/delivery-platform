import { after } from "next/server";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ module: "after-response" });

/**
 * Runs a side task (a WhatsApp alert, say) after the response is sent, so the visitor never
 * waits on it; failures are logged, never thrown. Outside a request (tests, scripts) the task
 * just starts right away.
 */
export function runAfterResponse(label: string, task: () => Promise<unknown>): void {
  const safe = async () => {
    try {
      await task();
    } catch (err) {
      log.warn({ err, label }, "Background task failed");
    }
  };
  try {
    after(safe);
  } catch {
    void safe();
  }
}
