import { describe, it, expect } from "vitest";
import { SupabaseUserSessionRepository } from "@/core/repositories/user-session.repository";

const USER = "11111111-1111-4111-8111-111111111111";
const LOGIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROW_ID = "c0000000-0000-4000-8000-000000000001";

type Result = { data: unknown; error: { message: string } | null };
type Call = { table?: string; rpc?: [string, unknown]; chain: Array<[string, ...unknown[]]> };

/**
 * A Supabase client that records every query (the builder methods called, in order) and answers
 * them with `results`, one per query.
 */
function fakeSupabase(results: Result[]) {
  const calls: Call[] = [];
  let next = 0;
  const answer = () => results[next++] ?? { data: null, error: null };

  const client = {
    from(table: string) {
      const call: Call = { table, chain: [] };
      calls.push(call);
      const result = answer();
      const builder: any = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === "then") {
              return (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
                Promise.resolve(result).then(resolve, reject);
            }
            return (...args: unknown[]) => {
              call.chain.push([String(prop), ...args]);
              return builder;
            };
          },
        }
      );
      return builder;
    },
    rpc(fn: string, args: unknown) {
      calls.push({ rpc: [fn, args], chain: [] });
      return Promise.resolve(answer());
    },
  };
  return { repo: new SupabaseUserSessionRepository(client as any), calls };
}

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  id: ROW_ID,
  user_id: USER,
  session_token_id: LOGIN,
  ip_address: "203.0.113.7",
  browser: "Google Chrome",
  browser_version: null,
  os: "macOS",
  os_version: null,
  device_type: "desktop",
  city: "Paris",
  country: "FR",
  is_revoked: false,
  last_active_at: "2026-11-11T10:00:00.000Z",
  created_at: "2026-11-11T10:00:00.000Z",
  ...overrides,
});

const input = {
  userId: USER,
  sessionTokenId: LOGIN,
  ipAddress: "203.0.113.7",
  browser: "Google Chrome",
  os: "macOS",
  deviceType: "desktop" as const,
  city: "Paris",
  country: "FR",
};

const methods = (call: Call) => call.chain.map(([method]) => method);
const filters = (call: Call) => call.chain.filter(([method]) => method === "eq" || method === "neq");

describe("core/repositories/SupabaseUserSessionRepository", () => {
  describe("insertIfAbsent", () => {
    it("inserts with ON CONFLICT DO NOTHING and never sends is_revoked", async () => {
      const { repo, calls } = fakeSupabase([{ data: [dbRow()], error: null }]);

      const result = await repo.insertIfAbsent(input);

      expect(result).toMatchObject({ created: true, session: { id: ROW_ID, sessionTokenId: LOGIN, isRevoked: false } });
      expect(calls).toHaveLength(1);
      const [, payload, options] = calls[0].chain[0];
      expect(calls[0].chain[0][0]).toBe("upsert");
      expect(options).toEqual({ onConflict: "session_token_id", ignoreDuplicates: true });
      expect(payload).toMatchObject({ user_id: USER, session_token_id: LOGIN, browser: "Google Chrome" });
      expect(payload).not.toHaveProperty("is_revoked");
    });

    it("leaves an existing row as it is and returns it, revoked included", async () => {
      const { repo, calls } = fakeSupabase([
        { data: [], error: null }, // conflict: nothing inserted
        { data: dbRow({ is_revoked: true }), error: null },
      ]);

      const result = await repo.insertIfAbsent(input);

      expect(result).toMatchObject({ created: false, session: { isRevoked: true } });
      expect(methods(calls[1])).toEqual(["select", "eq", "eq", "maybeSingle"]);
      expect(filters(calls[1])).toEqual([
        ["eq", "user_id", USER],
        ["eq", "session_token_id", LOGIN],
      ]);
      // Only a SELECT after the conflict: nothing updates the existing row.
      expect(calls.flatMap(methods)).not.toContain("update");
    });

    it("returns null when the login id is on another user's row", async () => {
      const { repo } = fakeSupabase([
        { data: [], error: null },
        { data: null, error: null },
      ]);
      await expect(repo.insertIfAbsent(input)).resolves.toBeNull();
    });

    it("throws on database errors", async () => {
      const { repo } = fakeSupabase([{ data: null, error: { message: "permission denied for table user_sessions" } }]);
      await expect(repo.insertIfAbsent(input)).rejects.toThrow(/permission denied/);
    });
  });

  describe("reads", () => {
    it("scope every lookup to the user", async () => {
      const { repo, calls } = fakeSupabase([
        { data: dbRow(), error: null },
        { data: dbRow(), error: null },
        { data: [dbRow()], error: null },
      ]);

      await repo.findByTokenId(USER, LOGIN);
      await repo.findById(USER, ROW_ID);
      await repo.listActiveByUserId(USER);

      expect(filters(calls[0])).toEqual([
        ["eq", "user_id", USER],
        ["eq", "session_token_id", LOGIN],
      ]);
      expect(filters(calls[1])).toEqual([
        ["eq", "user_id", USER],
        ["eq", "id", ROW_ID],
      ]);
      expect(filters(calls[2])).toEqual([
        ["eq", "user_id", USER],
        ["eq", "is_revoked", false],
      ]);
    });

    it("throw on database errors instead of answering 'no session'", async () => {
      const error = { message: "JWT expired" };
      await expect(fakeSupabase([{ data: null, error }]).repo.findByTokenId(USER, LOGIN)).rejects.toThrow(/JWT expired/);
      await expect(fakeSupabase([{ data: null, error }]).repo.findById(USER, ROW_ID)).rejects.toThrow(/JWT expired/);
      await expect(fakeSupabase([{ data: null, error }]).repo.listActiveByUserId(USER)).rejects.toThrow(/JWT expired/);
    });
  });

  describe("writes report what they changed", () => {
    it("revokeById: one of the user's rows, null when none matched", async () => {
      const { repo, calls } = fakeSupabase([
        { data: [dbRow({ is_revoked: true })], error: null },
        { data: [], error: null },
      ]);

      await expect(repo.revokeById(USER, ROW_ID)).resolves.toMatchObject({ id: ROW_ID, isRevoked: true });
      await expect(repo.revokeById(USER, ROW_ID)).resolves.toBeNull();

      expect(calls[0].chain[0]).toEqual(["update", { is_revoked: true }]);
      expect(filters(calls[0])).toEqual([
        ["eq", "user_id", USER],
        ["eq", "id", ROW_ID],
      ]);
    });

    it("revokeByTokenId: the user's row for a login, null when it has none", async () => {
      const { repo, calls } = fakeSupabase([{ data: [], error: null }]);

      await expect(repo.revokeByTokenId(USER, LOGIN)).resolves.toBeNull();
      expect(filters(calls[0])).toEqual([
        ["eq", "user_id", USER],
        ["eq", "session_token_id", LOGIN],
      ]);
    });

    it("revokeAllExcept: the user's other active rows", async () => {
      const { repo, calls } = fakeSupabase([{ data: [dbRow({ is_revoked: true })], error: null }]);

      await expect(repo.revokeAllExcept(USER, LOGIN)).resolves.toHaveLength(1);
      expect(filters(calls[0])).toEqual([
        ["eq", "user_id", USER],
        ["eq", "is_revoked", false],
        ["neq", "session_token_id", LOGIN],
      ]);
    });

    it("touch: only active rows, false when nothing matched, never changes is_revoked", async () => {
      const { repo, calls } = fakeSupabase([
        { data: [{ id: ROW_ID }], error: null },
        { data: [], error: null },
      ]);

      await expect(repo.touch(USER, LOGIN, { ipAddress: "198.51.100.1", city: undefined })).resolves.toBe(true);
      await expect(repo.touch(USER, LOGIN, {})).resolves.toBe(false);

      const [, changes] = calls[0].chain[0];
      expect(changes).toMatchObject({ ip_address: "198.51.100.1" });
      expect(changes).toHaveProperty("last_active_at");
      expect(changes).not.toHaveProperty("city");
      expect(changes).not.toHaveProperty("is_revoked");
      expect(filters(calls[0])).toContainEqual(["eq", "is_revoked", false]);
    });

    it("throw on database errors", async () => {
      const error = { message: "permission denied for table user_sessions" };
      await expect(fakeSupabase([{ data: null, error }]).repo.revokeById(USER, ROW_ID)).rejects.toThrow(/permission denied/);
      await expect(fakeSupabase([{ data: null, error }]).repo.revokeByTokenId(USER, LOGIN)).rejects.toThrow(/permission denied/);
      await expect(fakeSupabase([{ data: null, error }]).repo.revokeAllExcept(USER, LOGIN)).rejects.toThrow(/permission denied/);
      await expect(fakeSupabase([{ data: null, error }]).repo.touch(USER, LOGIN, {})).rejects.toThrow(/permission denied/);
    });
  });

  describe("endAuthSession", () => {
    it("calls revoke_auth_session with the user and the login", async () => {
      const { repo, calls } = fakeSupabase([
        { data: true, error: null },
        { data: false, error: null },
      ]);

      await expect(repo.endAuthSession(USER, LOGIN)).resolves.toBe(true);
      await expect(repo.endAuthSession(USER, LOGIN)).resolves.toBe(false);
      expect(calls[0].rpc).toEqual(["revoke_auth_session", { p_user_id: USER, p_session_id: LOGIN }]);
    });

    it("throws when the call fails", async () => {
      const { repo } = fakeSupabase([{ data: null, error: { message: "permission denied for function revoke_auth_session" } }]);
      await expect(repo.endAuthSession(USER, LOGIN)).rejects.toThrow(/permission denied/);
    });
  });
});
