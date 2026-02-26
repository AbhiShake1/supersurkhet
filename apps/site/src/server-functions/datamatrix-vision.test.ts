import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAssistantLanguageModelMock,
  generateObjectMock,
  getCookieMock,
  normalizeAssistantProviderConfigMock,
  refreshProviderCredentialIfNeededMock,
  setCookieMock,
} = vi.hoisted(() => ({
  createAssistantLanguageModelMock: vi.fn(),
  generateObjectMock: vi.fn(),
  getCookieMock: vi.fn(),
  normalizeAssistantProviderConfigMock: vi.fn(),
  refreshProviderCredentialIfNeededMock: vi.fn(),
  setCookieMock: vi.fn(),
}));

vi.mock('@tanstack/react-start/server', () => ({
  getCookie: getCookieMock,
  setCookie: setCookieMock,
}));

vi.mock('ai', () => ({
  generateObject: generateObjectMock,
}));

vi.mock('@/lib/ai/business-onboarding-provider-runtime', () => ({
  createAssistantLanguageModel: createAssistantLanguageModelMock,
  normalizeAssistantProviderConfig: normalizeAssistantProviderConfigMock,
}));

vi.mock('@/lib/ai/provider-oauth-refresh', () => ({
  refreshProviderCredentialIfNeeded: refreshProviderCredentialIfNeededMock,
}));

import {
  resolveVisionProviderConfig,
  runAiVisionProvider,
} from '@/server-functions/datamatrix-vision';

describe('datamatrix-vision provider runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCookieMock.mockReturnValue(undefined);
    normalizeAssistantProviderConfigMock.mockImplementation((input) => ({
      providerId: input.providerId ?? 'openai',
      model: input.model ?? 'gpt-5-mini',
      authMode: input.authMode ?? 'api-key',
      apiKey: input.apiKey,
      oauthAccessToken: input.oauthAccessToken,
      oauthRefreshToken: input.oauthRefreshToken,
      oauthExpiresAt: input.oauthExpiresAt,
      chatGptAccountId: input.chatGptAccountId,
      baseURL: input.baseURL,
      region: input.region,
      organization: input.organization,
      project: input.project,
      headers: input.headers,
    }));
    refreshProviderCredentialIfNeededMock.mockImplementation(
      async (provider) => ({
        provider,
        refreshed: false,
      }),
    );
    process.env.DATAMATRIX_V2_VISION_OFFICIAL_ENABLED = 'true';
    process.env.DATAMATRIX_V2_VISION_OPTIONAL_ENABLED = 'false';
  });

  it('resolves official lane provider defaults when runtime store is empty', () => {
    const resolved = resolveVisionProviderConfig({
      providerPath: 'official',
      providerStore: {},
    });

    expect(resolved.provider.providerId).toBe('openai');
    expect(resolved.provider.model).toBe('gpt-5-mini');
  });

  it('invokes configured provider and returns structured success payload', async () => {
    createAssistantLanguageModelMock.mockReturnValue({
      provider: 'mock',
    });
    generateObjectMock.mockResolvedValue({
      object: {
        summary: 'Vision model extracted actionable payload.',
        payload: {
          actionHint: 'navigate',
          table: '12',
        },
      },
    });

    const result = await runAiVisionProvider({
      request: {
        providerPath: 'official',
        scanHash: 'scan-hash',
        scanPayload: 'table=12',
        upload: null,
        sessionId: 'session-vision',
        scanAttemptId: 'attempt-vision',
      },
      providerConfig: {
        providerId: 'openai',
        model: 'gpt-5-mini',
        authMode: 'api-key',
      },
      temperature: 0,
      maxOutputTokens: 480,
    });

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      return;
    }
    expect(result.providerId).toBe('openai');
    expect(result.summary).toBe('Vision model extracted actionable payload.');
    expect(result.payload).toEqual({
      actionHint: 'navigate',
      table: '12',
    });
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable when no language model can be resolved', async () => {
    createAssistantLanguageModelMock.mockReturnValue(null);

    const result = await runAiVisionProvider({
      request: {
        providerPath: 'official',
        scanHash: 'scan-hash',
        scanPayload: 'raw-fallback-input',
        upload: null,
        sessionId: 'session-vision',
        scanAttemptId: 'attempt-vision',
      },
      providerConfig: {
        providerId: 'openai',
        model: 'gpt-5-mini',
        authMode: 'api-key',
      },
      temperature: 0,
      maxOutputTokens: 480,
    });

    expect(result.status).toBe('unavailable');
    if (result.status !== 'unavailable') {
      return;
    }
    expect(result.reason).toBe('provider_not_configured');
    expect(generateObjectMock).not.toHaveBeenCalled();
  });
});
