// tests/setup.ts
// Global test setup for Vitest
import { vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.STORAGE_PROVIDER = "mock";

// Mock next/headers for Server Actions
vi.mock("next/headers", () => {
  const cookieStore = new Map<string, { name: string; value: string }>();
  return {
    cookies: vi.fn().mockResolvedValue({
      get: vi.fn((name: string) => cookieStore.get(name)),
      set: vi.fn((name: string, value: string) => {
        cookieStore.set(name, { name, value });
      }),
      delete: vi.fn((name: string) => cookieStore.delete(name)),
      has: vi.fn((name: string) => cookieStore.has(name)),
      clear: vi.fn(() => cookieStore.clear()),
    }),
    headers: vi.fn().mockResolvedValue(new Headers()),
  };
});

// Mock next/cache for Server Actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
