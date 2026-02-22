import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const modelsRoutePath = resolve(process.cwd(), 'src/routes/v1/models.ts');
const chatRoutePath = resolve(process.cwd(), 'src/routes/chat/completions.ts');
const chatV1RoutePath = resolve(
  process.cwd(),
  'src/routes/v1/chat/completions.ts',
);
const providerAuthRoutePath = resolve(
  process.cwd(),
  'src/routes/v1/auth/providers.ts',
);
const authSessionsRoutePath = resolve(
  process.cwd(),
  'src/routes/v1/auth/sessions.ts',
);
const providerAuthMethodsRoutePath = resolve(
  process.cwd(),
  'src/routes/v1/auth/providers/methods.ts',
);
const providerOauthAuthorizeRoutePath = resolve(
  process.cwd(),
  'src/routes/v1/auth/providers/oauth/authorize.ts',
);
const providerOauthCallbackRoutePath = resolve(
  process.cwd(),
  'src/routes/v1/auth/providers/oauth/callback.ts',
);

describe('openai compatible ai api routes contract', () => {
  it('registers models and chat completion routes', () => {
    const modelsRouteSource = readFileSync(modelsRoutePath, 'utf8');
    const chatRouteSource = readFileSync(chatRoutePath, 'utf8');
    const chatV1RouteSource = readFileSync(chatV1RoutePath, 'utf8');

    expect(modelsRouteSource).toContain("createFileRoute('/v1/models')");
    expect(modelsRouteSource).toContain('handleModelsRequest');
    expect(chatRouteSource).toContain("createFileRoute('/chat/completions')");
    expect(chatRouteSource).toContain('handleChatCompletionsRequest');
    expect(chatV1RouteSource).toContain(
      "createFileRoute('/v1/chat/completions')",
    );
    expect(chatV1RouteSource).toContain('handleChatCompletionsRequest');
  });

  it('registers provider credential and auth session routes', () => {
    const providerAuthSource = readFileSync(providerAuthRoutePath, 'utf8');
    const authSessionsSource = readFileSync(authSessionsRoutePath, 'utf8');
    const providerAuthMethodsSource = readFileSync(
      providerAuthMethodsRoutePath,
      'utf8',
    );
    const providerOauthAuthorizeSource = readFileSync(
      providerOauthAuthorizeRoutePath,
      'utf8',
    );
    const providerOauthCallbackSource = readFileSync(
      providerOauthCallbackRoutePath,
      'utf8',
    );

    expect(providerAuthSource).toContain(
      "createFileRoute('/v1/auth/providers')",
    );
    expect(providerAuthSource).toContain('handleProviderCredentialRequest');
    expect(authSessionsSource).toContain(
      "createFileRoute('/v1/auth/sessions')",
    );
    expect(authSessionsSource).toContain('handleAuthSessionRequest');
    expect(providerAuthMethodsSource).toContain(
      "createFileRoute('/v1/auth/providers/methods')",
    );
    expect(providerAuthMethodsSource).toContain(
      'handleProviderAuthMethodsRequest',
    );
    expect(providerOauthAuthorizeSource).toContain(
      "createFileRoute('/v1/auth/providers/oauth/authorize')",
    );
    expect(providerOauthAuthorizeSource).toContain(
      'handleProviderOauthAuthorizeRequest',
    );
    expect(providerOauthCallbackSource).toContain(
      "createFileRoute('/v1/auth/providers/oauth/callback')",
    );
    expect(providerOauthCallbackSource).toContain(
      'handleProviderOauthCallbackRequest',
    );
  });
});
