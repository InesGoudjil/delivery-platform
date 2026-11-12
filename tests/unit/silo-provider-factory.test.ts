import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AwsSiloGlacierProvider,
  MockSiloGlacierProvider,
  SiloProviderFactory,
  SiloUnavailableError,
  UnavailableSiloProvider,
} from "@/core/providers/storage/silo-glacier.provider";
import { env } from "@/lib/env";

const SAVED = {
  isSiloEnabled: env.isSiloEnabled,
  SILO_ENABLED: env.SILO_ENABLED,
  isAwsSiloConfigured: env.isAwsSiloConfigured,
  AWS_S3_SILO_BUCKET: env.AWS_S3_SILO_BUCKET,
  AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
};

function setSilo(state: { switch: boolean; aws: boolean }) {
  env.SILO_ENABLED = state.switch;
  env.isAwsSiloConfigured = state.aws;
  env.isSiloEnabled = state.switch && state.aws;
  env.AWS_S3_SILO_BUCKET = state.aws ? "silo-test-bucket" : "";
  env.AWS_ACCESS_KEY_ID = state.aws ? "AKIATESTTESTTEST" : "";
  env.AWS_SECRET_ACCESS_KEY = state.aws ? "test-secret" : "";
}

async function expectUnavailable(provider: ReturnType<typeof SiloProviderFactory.createProvider>) {
  expect(provider).toBeInstanceOf(UnavailableSiloProvider);
  expect(provider).not.toBeInstanceOf(MockSiloGlacierProvider);
  expect(provider.isConfigured()).toBe(false);
  await expect(
    provider.archiveStream({ stream: [] as any, targetKey: "silo/x" })
  ).rejects.toBeInstanceOf(SiloUnavailableError);
  await expect(provider.requestRestore({ key: "silo/x" })).rejects.toBeInstanceOf(SiloUnavailableError);
  await expect(provider.checkRestoreStatus("silo/x")).rejects.toBeInstanceOf(SiloUnavailableError);
  await expect(provider.getArchiveObjectInfo("silo/x")).rejects.toBeInstanceOf(SiloUnavailableError);
  await expect(provider.getObjectStream("silo/x")).rejects.toBeInstanceOf(SiloUnavailableError);
}

describe("SiloProviderFactory", () => {
  const nodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.assign(env, SAVED);
    (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  });

  it("hands out a provider that refuses everything while The Silo is switched off", async () => {
    setSilo({ switch: false, aws: true });
    await expectUnavailable(SiloProviderFactory.createProvider());
  });

  it("fails loudly instead of mocking when SILO_ENABLED is on but AWS is not configured", async () => {
    setSilo({ switch: true, aws: false });
    await expectUnavailable(SiloProviderFactory.createProvider());
  });

  it("uses AWS Glacier only when switched on and configured", () => {
    setSilo({ switch: true, aws: true });
    const provider = SiloProviderFactory.createProvider();
    expect(provider).toBeInstanceOf(AwsSiloGlacierProvider);
    expect(provider.isConfigured()).toBe(true);
  });

  it("never returns the in-memory mock outside tests, even when asked", () => {
    setSilo({ switch: false, aws: false });
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(() => SiloProviderFactory.createProvider({ allowMock: true })).toThrow(/only available when NODE_ENV/);
    expect(SiloProviderFactory.createProvider()).not.toBeInstanceOf(MockSiloGlacierProvider);

    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    expect(() => SiloProviderFactory.createProvider({ allowMock: true })).toThrow(/only available when NODE_ENV/);
  });

  it("returns the mock to tests that ask for it, and the mock does not pretend to be durable", async () => {
    const provider = SiloProviderFactory.createProvider({ allowMock: true });
    expect(provider).toBeInstanceOf(MockSiloGlacierProvider);
    expect(provider.isConfigured()).toBe(false);
    // Unknown keys are not "restored" any more.
    expect(await provider.checkRestoreStatus("silo/workspaces/x/never-archived.mov")).toMatchObject({
      isRestored: false,
      status: "not_found",
    });
  });
});

describe("SILO_ENABLED", () => {
  const KEYS = ["SILO_ENABLED", "AWS_S3_SILO_BUCKET", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"] as const;

  async function loadEnv(values: Partial<Record<(typeof KEYS)[number], string>>) {
    const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
    try {
      for (const key of KEYS) {
        if (values[key] === undefined) delete process.env[key];
        else process.env[key] = values[key];
      }
      vi.resetModules();
      return (await import("@/lib/env")).env;
    } finally {
      for (const key of KEYS) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
      vi.resetModules();
    }
  }

  const aws = {
    AWS_S3_SILO_BUCKET: "silo-bucket",
    AWS_ACCESS_KEY_ID: "AKIAREALKEY",
    AWS_SECRET_ACCESS_KEY: "real-secret",
  };

  it("is off by default and for anything but \"true\"", async () => {
    expect((await loadEnv({ ...aws })).isSiloEnabled).toBe(false);
    expect((await loadEnv({ ...aws, SILO_ENABLED: "false" })).isSiloEnabled).toBe(false);
    expect((await loadEnv({ ...aws, SILO_ENABLED: "1" })).isSiloEnabled).toBe(false);
    expect((await loadEnv({ ...aws, SILO_ENABLED: "yes" })).isSiloEnabled).toBe(false);
  });

  it("needs real AWS settings as well as the switch", async () => {
    expect((await loadEnv({ ...aws, SILO_ENABLED: "true" })).isSiloEnabled).toBe(true);
    expect((await loadEnv({ ...aws, SILO_ENABLED: " TRUE " })).isSiloEnabled).toBe(true);
    expect((await loadEnv({ SILO_ENABLED: "true" })).isSiloEnabled).toBe(false);
    expect(
      (
        await loadEnv({
          SILO_ENABLED: "true",
          AWS_S3_SILO_BUCKET: "cinespace-silo-archive",
          AWS_ACCESS_KEY_ID: "your-aws-access-key-id",
          AWS_SECRET_ACCESS_KEY: "your-aws-secret-access-key",
        })
      ).isSiloEnabled
    ).toBe(false);
  });
});
