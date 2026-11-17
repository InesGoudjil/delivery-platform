/**
 * Ids per `.in()` filter. PostgREST takes the list in the URL (about 40 characters per UUID),
 * so long lists are split to stay far below proxy URL limits.
 */
export const IN_FILTER_CHUNK = 100;

/**
 * Runs `query` once per chunk of ids (duplicates dropped), in parallel, and joins the rows in
 * chunk order. Rows of one id are never split across chunks.
 */
export async function inChunks<T>(
  ids: readonly string[],
  query: (chunk: string[]) => Promise<T[]>,
  size: number = IN_FILTER_CHUNK
): Promise<T[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += size) chunks.push(unique.slice(i, i + size));
  const results = await Promise.all(chunks.map((chunk) => query(chunk)));
  return results.flat();
}
