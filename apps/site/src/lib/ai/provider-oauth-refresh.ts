import type { AssistantProviderConfig } from './business-onboarding-provider-runtime';
import { refreshGoogleProviderCredentialIfNeeded } from './google-antigravity-oauth';
import { refreshOpenAiProviderCredentialIfNeeded } from './openai-oauth';

type RefreshProviderCredentialOptions = {
  nowInSeconds: number;
  model?: string;
  expiryLeewaySeconds?: number;
  fetch?: typeof fetch;
};

export async function refreshProviderCredentialIfNeeded(
  provider: AssistantProviderConfig,
  options: RefreshProviderCredentialOptions,
): Promise<{
  provider: AssistantProviderConfig;
  refreshed: boolean;
}> {
  if (provider.providerId === 'openai') {
    return refreshOpenAiProviderCredentialIfNeeded(provider, options);
  }

  if (provider.providerId === 'google') {
    return refreshGoogleProviderCredentialIfNeeded(provider, options);
  }

  return {
    provider,
    refreshed: false,
  };
}
