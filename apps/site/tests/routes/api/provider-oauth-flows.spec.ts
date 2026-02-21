import http from "node:http";
import { expect, test } from "@playwright/test";

const oauthStubHost = "127.0.0.1";
const oauthStubPort = 34567;
const appAuthCookie = "gun-user=%7B%22pub%22%3A%22e2e-user%22%7D";

type JsonRecord = Record<string, unknown>;

function readJsonBody(request: http.IncomingMessage): Promise<JsonRecord> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    request.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? (JSON.parse(text) as JsonRecord) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function respondJson(
  response: http.ServerResponse,
  statusCode: number,
  payload: JsonRecord,
) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload));
}

function setCookieHeaderToCookieValue(setCookieHeader: string | null): string {
  if (!setCookieHeader) return "";
  const first = setCookieHeader.split(",")[0] ?? "";
  return first.split(";")[0] ?? "";
}

function requireCookieValueFromSetCookieHeader(
  setCookieHeader: string | null,
): string {
  const value = setCookieHeaderToCookieValue(setCookieHeader);
  expect(value.length).toBeGreaterThan(0);
  return value;
}

test.describe("provider oauth e2e flows", () => {
  test.describe.configure({ mode: "serial" });

  let oauthStubServer: http.Server;
  let openAiDevicePollCount = 0;
  let githubDevicePollCount = 0;

  test.beforeAll(async () => {
    oauthStubServer = http.createServer(async (request, response) => {
      const url = new URL(
        request.url ?? "/",
        `http://${oauthStubHost}:${oauthStubPort}`,
      );

      if (
        request.method === "POST" &&
        url.pathname === "/openrouter/api/v1/auth/keys"
      ) {
        await readJsonBody(request);
        respondJson(response, 200, {
          key: "sk-or-v1-e2e-openrouter-key",
        });
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/openai/api/accounts/deviceauth/usercode"
      ) {
        respondJson(response, 200, {
          device_auth_id: "openai-device-auth-id",
          user_code: "OPENAI-CODE-123",
          interval: 2,
        });
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/openai/api/accounts/deviceauth/token"
      ) {
        openAiDevicePollCount += 1;
        if (openAiDevicePollCount === 1) {
          response.statusCode = 403;
          response.end("");
          return;
        }

        respondJson(response, 200, {
          authorization_code: "openai-authorization-code",
          code_verifier: "openai-device-code-verifier",
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/openai/oauth/token") {
        respondJson(response, 200, {
          access_token: "openai-access-token-e2e",
          refresh_token: "openai-refresh-token-e2e",
          expires_in: 3600,
        });
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/github/login/device/code"
      ) {
        respondJson(response, 200, {
          verification_uri: "https://github.com/login/device",
          user_code: "GITHUB-CODE-123",
          device_code: "github-device-code",
          interval: 2,
        });
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/github/login/oauth/access_token"
      ) {
        githubDevicePollCount += 1;
        if (githubDevicePollCount === 1) {
          respondJson(response, 200, {
            error: "authorization_pending",
          });
          return;
        }

        respondJson(response, 200, {
          access_token: "ghu_copilot_e2e_access_token",
        });
        return;
      }

      response.statusCode = 404;
      response.end("not-found");
    });

    await new Promise<void>((resolve) => {
      oauthStubServer.listen(oauthStubPort, oauthStubHost, () => resolve());
    });
  });

  test.beforeEach(() => {
    openAiDevicePollCount = 0;
    githubDevicePollCount = 0;
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      oauthStubServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  test("completes browser-style oauth callback for openrouter", async ({
    request,
  }) => {
    const authorizeResponse = await request.post(
      "/v1/auth/providers/oauth/authorize",
      {
        headers: {
          cookie: appAuthCookie,
          "content-type": "application/json",
        },
        data: {
          providerId: "openrouter",
          methodId: "openrouter-account-oauth",
          model: "openai/gpt-5",
        },
      },
    );

    expect(authorizeResponse.status()).toBe(200);
    const authorizePayload = (await authorizeResponse.json()) as {
      authorizationUrl?: string;
      method?: string;
    };
    expect(authorizePayload.method).toBe("openrouter-account-oauth");
    expect(authorizePayload.authorizationUrl).toContain(
      `http://${oauthStubHost}:${oauthStubPort}/openrouter/auth`,
    );

    const state = new URL(authorizePayload.authorizationUrl ?? "").searchParams.get(
      "state",
    );
    expect(state).toBeTruthy();

    const oauthStateCookie = requireCookieValueFromSetCookieHeader(
      authorizeResponse.headers()["set-cookie"] ?? null,
    );

    const callbackResponse = await request.post(
      "/v1/auth/providers/oauth/callback",
      {
        headers: {
          cookie: `${appAuthCookie}; ${oauthStateCookie}`,
          "content-type": "application/json",
        },
        data: {
          code: "openrouter-oauth-code",
          state,
        },
      },
    );

    expect(callbackResponse.status()).toBe(200);
    const callbackPayload = (await callbackResponse.json()) as {
      providerId?: string;
      method?: string;
      data?: {
        authMode?: string;
        providerId?: string;
        hasOauthAccessToken?: boolean;
      };
    };
    expect(callbackPayload.providerId).toBe("openrouter");
    expect(callbackPayload.method).toBe("openrouter-account-oauth");
    expect(callbackPayload.data?.providerId).toBe("openrouter");
    expect(callbackPayload.data?.authMode).toBe("oauth-access-token");
    expect(callbackPayload.data?.hasOauthAccessToken).toBe(true);
  });

  test("completes headless device oauth callback for openai", async ({
    request,
  }) => {
    const authorizeResponse = await request.post(
      "/v1/auth/providers/oauth/authorize",
      {
        headers: {
          cookie: appAuthCookie,
          "content-type": "application/json",
        },
        data: {
          providerId: "openai",
          methodId: "openai-chatgpt-pro-plus-headless",
          model: "gpt-5-mini",
        },
      },
    );

    expect(authorizeResponse.status()).toBe(200);
    const authorizePayload = (await authorizeResponse.json()) as {
      method?: string;
      verificationCode?: string;
      pollingIntervalSeconds?: number;
    };
    expect(authorizePayload.method).toBe("openai-chatgpt-pro-plus-headless");
    expect(authorizePayload.verificationCode).toBe("OPENAI-CODE-123");
    expect(authorizePayload.pollingIntervalSeconds).toBe(2);

    const oauthStateCookie = requireCookieValueFromSetCookieHeader(
      authorizeResponse.headers()["set-cookie"] ?? null,
    );

    const pendingResponse = await request.post(
      "/v1/auth/providers/oauth/callback",
      {
        headers: {
          cookie: `${appAuthCookie}; ${oauthStateCookie}`,
          "content-type": "application/json",
        },
        data: {},
      },
    );
    expect(pendingResponse.status()).toBe(202);
    const pendingPayload = (await pendingResponse.json()) as {
      providerId?: string;
      status?: string;
      retryAfterSeconds?: number;
    };
    expect(pendingPayload.providerId).toBe("openai");
    expect(pendingPayload.status).toBe("pending");
    expect(pendingPayload.retryAfterSeconds).toBe(2);

    const successResponse = await request.post(
      "/v1/auth/providers/oauth/callback",
      {
        headers: {
          cookie: `${appAuthCookie}; ${oauthStateCookie}`,
          "content-type": "application/json",
        },
        data: {},
      },
    );
    expect(successResponse.status()).toBe(200);
    const successPayload = (await successResponse.json()) as {
      providerId?: string;
      method?: string;
      data?: {
        authMode?: string;
        hasOauthAccessToken?: boolean;
      };
    };
    expect(successPayload.providerId).toBe("openai");
    expect(successPayload.method).toBe("openai-chatgpt-pro-plus-headless");
    expect(successPayload.data?.authMode).toBe("oauth-access-token");
    expect(successPayload.data?.hasOauthAccessToken).toBe(true);
  });

  test("completes headless device oauth callback for github copilot", async ({
    request,
  }) => {
    const authorizeResponse = await request.post(
      "/v1/auth/providers/oauth/authorize",
      {
        headers: {
          cookie: appAuthCookie,
          "content-type": "application/json",
        },
        data: {
          providerId: "github-copilot",
          methodId: "github-copilot-device-oauth",
          model: "gpt-4.1",
        },
      },
    );

    expect(authorizeResponse.status()).toBe(200);
    const authorizePayload = (await authorizeResponse.json()) as {
      method?: string;
      verificationCode?: string;
      pollingIntervalSeconds?: number;
    };
    expect(authorizePayload.method).toBe("github-copilot-device-oauth");
    expect(authorizePayload.verificationCode).toBe("GITHUB-CODE-123");
    expect(authorizePayload.pollingIntervalSeconds).toBe(2);

    const oauthStateCookie = requireCookieValueFromSetCookieHeader(
      authorizeResponse.headers()["set-cookie"] ?? null,
    );

    const pendingResponse = await request.post(
      "/v1/auth/providers/oauth/callback",
      {
        headers: {
          cookie: `${appAuthCookie}; ${oauthStateCookie}`,
          "content-type": "application/json",
        },
        data: {},
      },
    );
    expect(pendingResponse.status()).toBe(202);
    const pendingPayload = (await pendingResponse.json()) as {
      providerId?: string;
      status?: string;
      retryAfterSeconds?: number;
    };
    expect(pendingPayload.providerId).toBe("github-copilot");
    expect(pendingPayload.status).toBe("pending");
    expect(pendingPayload.retryAfterSeconds).toBe(2);

    const successResponse = await request.post(
      "/v1/auth/providers/oauth/callback",
      {
        headers: {
          cookie: `${appAuthCookie}; ${oauthStateCookie}`,
          "content-type": "application/json",
        },
        data: {},
      },
    );
    expect(successResponse.status()).toBe(200);
    const successPayload = (await successResponse.json()) as {
      providerId?: string;
      method?: string;
      data?: {
        authMode?: string;
        hasOauthAccessToken?: boolean;
      };
    };
    expect(successPayload.providerId).toBe("github-copilot");
    expect(successPayload.method).toBe("github-copilot-device-oauth");
    expect(successPayload.data?.authMode).toBe("oauth-access-token");
    expect(successPayload.data?.hasOauthAccessToken).toBe(true);
  });
});
