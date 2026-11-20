/**
 * The sentence an error screen (error.tsx) shows. While developing, the error's own message helps;
 * in production a server error's message is only Next's generic "An error occurred in the Server
 * Components render… omitted in production builds" text, so the screen's own wording is used.
 */
export function errorScreenMessage(error: Error, fallback: string): string {
  return process.env.NODE_ENV === "development" && error.message ? error.message : fallback;
}
