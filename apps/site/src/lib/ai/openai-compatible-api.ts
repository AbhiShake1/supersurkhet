import { nanoid } from 'nanoid';
import { z } from 'zod';
import { BUSINESS_ONBOARDING_MODEL_OPTIONS } from './business-onboarding-models';
import {
  createAssistantLanguageModel,
  normalizeAssistantProviderConfig,
} from './business-onboarding-provider-runtime';
import {
  type AiAuthSessionPayload,
  buildProviderCredentialStoreSetCookie,
  createAiAuthSessionToken,
  decodeAiAuthSessionToken,
  extractBearerToken,
  readProviderCredentialStoreFromRequest,
  type StoredProviderCredential,
} from './provider-auth-store';
import { refreshProviderCredentialIfNeeded } from './provider-oauth-refresh';

type CompletionUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

type CompletionResult = {
  text: string;
  usage?: CompletionUsage;
};

type GenerateCompletionContext = {
  model: string;
  messages: OpenAiChatMessage[];
  session: AiAuthSessionPayload;
  requestBody: OpenAiChatCompletionRequest;
};

type OpenAiCompatibleApiOptions = {
  secret?: string;
  now?: () => number;
  fetch?: typeof fetch;
  generateCompletion?: (
    context: GenerateCompletionContext,
  ) => Promise<CompletionResult>;
};

type SessionResolutionResult =
  | {
      ok: true;
      value: {
        session: AiAuthSessionPayload;
        responseHeaders?: Headers;
      };
    }
  | {
      ok: false;
      error: Response;
    };

const AI_AUTH_SESSION_ROTATED_TOKEN_HEADER = 'x-ai-auth-session-token';

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([
    z.string(),
    z.array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
      }),
    ),
  ]),
});

const chatCompletionRequestSchema = z.object({
  model: z.string().optional(),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  messages: z.array(chatMessageSchema).min(1),
});

type OpenAiChatMessage = z.infer<typeof chatMessageSchema>;
type OpenAiChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>;

function resolveNow(options?: OpenAiCompatibleApiOptions): number {
  return options?.now
    ? Math.floor(options.now())
    : Math.floor(Date.now() / 1000);
}

function openAiError(
  message: string,
  status = 400,
  type = 'invalid_request_error',
): Response {
  return Response.json(
    {
      error: {
        message,
        type,
        param: null,
        code: null,
      },
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

function jsonResponse(data: unknown, extraHeaders?: Headers): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  if (extraHeaders) {
    for (const [key, value] of extraHeaders.entries()) {
      headers.append(key, value);
    }
  }
  return new Response(JSON.stringify(data), {
    status: 200,
    headers,
  });
}

function messageContentToText(content: OpenAiChatMessage['content']): string {
  if (typeof content === 'string') return content;
  const textParts = content
    .map((part) => part.text?.trim() ?? '')
    .filter((part) => part.length > 0);
  return textParts.join('\n');
}

function toPrompt(messages: OpenAiChatMessage[]): string {
  return messages
    .map(
      (message) => `${message.role}: ${messageContentToText(message.content)}`,
    )
    .join('\n');
}

async function defaultGenerateCompletion(
  context: GenerateCompletionContext,
): Promise<CompletionResult> {
  const { generateText } = await import('ai');

  const normalizedProvider = normalizeAssistantProviderConfig(
    {
      ...context.session.provider,
      model: context.model,
    },
    context.model,
  );

  const model = createAssistantLanguageModel(normalizedProvider);
  if (!model) {
    throw new Error('Unable to resolve language model from auth session.');
  }

  const result = await generateText({
    // biome-ignore lint/suspicious/noExplicitAny: dynamic provider model contract
    model: model as any,
    prompt: toPrompt(context.messages),
    temperature: context.requestBody.temperature,
    maxOutputTokens: context.requestBody.max_tokens,
  });

  return {
    text: result.text,
    usage: {
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    },
  };
}

function resolveSessionFromRequest(
  request: Request,
  options: OpenAiCompatibleApiOptions,
): AiAuthSessionPayload | null {
  const token = extractBearerToken(request);
  return decodeAiAuthSessionToken(token, {
    secret: options.secret,
    now: resolveNow(options),
  });
}

function updateStoredCredentialWithRefreshedOAuth(input: {
  stored: StoredProviderCredential;
  refreshedSession: AiAuthSessionPayload;
  nowInSeconds: number;
}): StoredProviderCredential {
  return {
    ...input.stored,
    oauthAccessToken: input.refreshedSession.provider.oauthAccessToken,
    oauthRefreshToken: input.refreshedSession.provider.oauthRefreshToken,
    oauthExpiresAt: input.refreshedSession.provider.oauthExpiresAt,
    chatGptAccountId: input.refreshedSession.provider.chatGptAccountId,
    baseURL: input.refreshedSession.provider.baseURL ?? input.stored.baseURL,
    headers: input.refreshedSession.provider.headers ?? input.stored.headers,
    updatedAt: input.nowInSeconds,
  };
}

async function resolveSessionContextFromRequest(
  request: Request,
  options: OpenAiCompatibleApiOptions,
): Promise<SessionResolutionResult> {
  const session = resolveSessionFromRequest(request, options);
  if (!session) {
    return {
      ok: false,
      error: openAiError(
        'Invalid or expired auth session token.',
        401,
        'auth_error',
      ),
    };
  }

  const nowInSeconds = resolveNow(options);
  try {
    const refreshed = await refreshProviderCredentialIfNeeded(
      session.provider,
      {
        nowInSeconds,
        model: session.provider.model,
        fetch: options.fetch,
      },
    );
    if (!refreshed.refreshed) {
      return {
        ok: true,
        value: {
          session,
        },
      };
    }

    const ttlSeconds = Math.max(60, session.exp - nowInSeconds);
    const refreshedSession: AiAuthSessionPayload = {
      ...session,
      iat: nowInSeconds,
      exp: nowInSeconds + ttlSeconds,
      provider: refreshed.provider,
    };
    const responseHeaders = new Headers();
    responseHeaders.set(
      AI_AUTH_SESSION_ROTATED_TOKEN_HEADER,
      createAiAuthSessionToken(refreshed.provider, {
        secret: options.secret,
        now: nowInSeconds,
        ttlSeconds,
      }),
    );

    const store = readProviderCredentialStoreFromRequest(request, {
      secret: options.secret,
    });
    const storedProvider = store[refreshed.provider.providerId];
    if (storedProvider) {
      store[storedProvider.providerId] =
        updateStoredCredentialWithRefreshedOAuth({
          stored: storedProvider,
          refreshedSession,
          nowInSeconds,
        });
      responseHeaders.append(
        'Set-Cookie',
        buildProviderCredentialStoreSetCookie(store, {
          secret: options.secret,
        }),
      );
    }

    return {
      ok: true,
      value: {
        session: refreshedSession,
        responseHeaders,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: openAiError(
        error instanceof Error ? error.message : 'OAuth token refresh failed.',
        502,
        'auth_error',
      ),
    };
  }
}

export function createOpenAiCompatibleApiHandlers(
  options: OpenAiCompatibleApiOptions = {},
) {
  const generateCompletion =
    options.generateCompletion ?? defaultGenerateCompletion;

  return {
    async handleModelsRequest(request: Request): Promise<Response> {
      const sessionResult = await resolveSessionContextFromRequest(
        request,
        options,
      );
      if (!sessionResult.ok) return sessionResult.error;
      const { session, responseHeaders } = sessionResult.value;

      const providerModels = BUSINESS_ONBOARDING_MODEL_OPTIONS.filter(
        (option) => option.provider === session.provider.providerId,
      ).map((option) => option.id);

      const uniqueModelIds = Array.from(
        new Set([...providerModels, session.provider.model]),
      );
      const created = resolveNow(options);

      return jsonResponse(
        {
          object: 'list',
          data: uniqueModelIds.map((id) => ({
            id,
            object: 'model',
            created,
            owned_by: session.provider.providerId,
          })),
        },
        responseHeaders,
      );
    },

    async handleChatCompletionsRequest(request: Request): Promise<Response> {
      const sessionResult = await resolveSessionContextFromRequest(
        request,
        options,
      );
      if (!sessionResult.ok) return sessionResult.error;
      const { session, responseHeaders } = sessionResult.value;

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return openAiError('Request body must be valid JSON.');
      }

      const parsed = chatCompletionRequestSchema.safeParse(body);
      if (!parsed.success) {
        return openAiError('Invalid chat completions payload.');
      }

      if (parsed.data.stream) {
        return openAiError('stream=true is not supported yet.', 400);
      }

      const resolvedModel = parsed.data.model ?? session.provider.model;

      let completion: CompletionResult;
      try {
        completion = await generateCompletion({
          model: resolvedModel,
          messages: parsed.data.messages,
          session,
          requestBody: parsed.data,
        });
      } catch (error) {
        return openAiError(
          error instanceof Error ? error.message : 'Chat completion failed.',
          500,
          'server_error',
        );
      }

      const promptTokens = completion.usage?.inputTokens ?? 0;
      const completionTokens = completion.usage?.outputTokens ?? 0;

      return jsonResponse(
        {
          id: `chatcmpl_${nanoid(24)}`,
          object: 'chat.completion',
          created: resolveNow(options),
          model: resolvedModel,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: completion.text,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
          },
        },
        responseHeaders,
      );
    },
  };
}
