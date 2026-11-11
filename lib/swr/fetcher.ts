export interface SWRError extends Error {
  info?: any;
  status?: number;
}

/**
 * Standard type-safe fetcher for SWR requests with error message extraction.
 */
export async function fetcher<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit & { headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    ...(init?.headers ? { headers: init.headers } : {}),
  });

  if (!res.ok) {
    let errorMessage = "An error occurred while fetching the data.";
    try {
      const data = await res.json();
      errorMessage = data?.error?.message || data?.error || data?.message || errorMessage;
    } catch {
      // response is not JSON
    }

    const error = new Error(errorMessage) as SWRError;
    error.info = errorMessage;
    error.status = res.status;
    throw error;
  }

  return res.json();
}
