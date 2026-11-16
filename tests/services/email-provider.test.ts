import { afterEach, describe, expect, it, vi } from "vitest";
import { ZeptoMailEmailProvider } from "@/core/providers/email";

const API_URL = "https://cpaas.zoho.com/v1.1/email";

/** Sends one email with this key and returns the Authorization header Zoho received. */
async function authorizationFor(apiToken: string): Promise<string> {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ data: [{ additional_info: [{ message_id: "m-1" }] }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );
  vi.stubGlobal("fetch", fetchMock);

  const provider = new ZeptoMailEmailProvider({ apiToken, apiUrl: API_URL });
  const result = await provider.sendEmail({ to: "client@example.com", subject: "Hi", html: "<p>Hi</p>" });

  expect(result).toEqual({ success: true, messageId: "m-1" });
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(API_URL);
  return (init.headers as Record<string, string>).Authorization;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ZeptoMailEmailProvider authorization", () => {
  it("sends a key pasted as the Zoho CPaaS console shows it unchanged", async () => {
    expect(await authorizationFor("Zoho-enczapikey abc==")).toBe("Zoho-enczapikey abc==");
  });

  it("keeps an older Zoho scheme as is", async () => {
    expect(await authorizationFor("Zoho-encztoken abc")).toBe("Zoho-encztoken abc");
  });

  it("gives a bare key the Zoho-enczapikey scheme", async () => {
    expect(await authorizationFor("  abc==  ")).toBe("Zoho-enczapikey abc==");
  });
});
