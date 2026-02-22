import { Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  PromptInputCommand,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandInput,
  PromptInputCommandItem,
  PromptInputCommandList,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
} from '@/components/ai-elements/prompt-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AssistantAuthMode } from '@/lib/ai/business-onboarding-models';
import { cn } from '@/lib/utils';
import type { BusinessOnboardingStage } from './business-onboarding-chat-state';

const MODELS_DEV_PROVIDER_LOGO_BASE_URL = 'https://models.dev/logos/';
const modelsDevProviderLogoOverrides: Record<string, string> = {
  bedrock: 'amazon-bedrock',
  together: 'togetherai',
  ollama: 'ollama-cloud',
  'custom-openai-compatible': 'openai',
};

function resolveModelsDevProviderId(providerId: string): string {
  return modelsDevProviderLogoOverrides[providerId] ?? providerId;
}

function resolveModelsDevProviderLogoUrl(providerId: string): string {
  return `${MODELS_DEV_PROVIDER_LOGO_BASE_URL}${encodeURIComponent(resolveModelsDevProviderId(providerId))}.svg`;
}

function ProviderLogo({
  providerId,
  label,
}: {
  providerId: string;
  label: string;
}) {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-background">
      <img
        src={resolveModelsDevProviderLogoUrl(providerId)}
        alt={`${label} logo`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-3.5 w-3.5 object-contain dark:invert"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    </span>
  );
}

export interface OptionProviderItem {
  providerId: string;
  label: string;
  supportedAuthModes: readonly AssistantAuthMode[];
}

export interface OptionModelItem {
  id: string;
  label: string;
  description?: string;
  providerId: string;
  group: 'default' | 'preferred' | 'custom';
}

export interface OptionAuthModeItem {
  id: AssistantAuthMode;
  label: string;
}

export interface OptionOauthMethodItem {
  id: string;
  label: string;
}

interface BusinessOnboardingOptionComposerProps {
  stage: BusinessOnboardingStage;
  providerOptions: readonly OptionProviderItem[];
  modelOptions: readonly OptionModelItem[];
  authModeOptions: readonly OptionAuthModeItem[];
  oauthMethods: readonly OptionOauthMethodItem[];
  selectedProviderId: string;
  selectedModelId: string;
  selectedAuthMode: AssistantAuthMode;
  selectedOauthMethodId: string;
  isStartingOauth: boolean;
  canStartOauth: boolean;
  oauthConnectLabel: string;
  hasProviderCredential: boolean;
  hasAuthError: boolean;
  onSelectProvider: (providerId: string) => void;
  onSelectModel: (modelId: string) => void;
  onSelectAuthMode: (authMode: AssistantAuthMode) => void;
  onSelectOauthMethod: (oauthMethodId: string) => void;
  onStartOauth: () => void;
  onContinueToIntent: () => void;
  onRefreshCredentialStatus: () => void;
  onSaveManualCredential: () => void;
  isSavingManualCredential: boolean;
  isRefreshingCredential: boolean;
}

function authModeBadgeLabel(mode: AssistantAuthMode): string {
  if (mode === 'api-key') return 'API key';
  if (mode === 'oauth-access-token') return 'OAuth';
  if (mode === 'aws-credential-chain') return 'AWS chain';
  return 'No auth';
}

function modelGroupLabel(group: OptionModelItem['group']): string {
  if (group === 'default') return 'Default';
  if (group === 'preferred') return 'Preferred';
  return 'Custom';
}

export function BusinessOnboardingOptionComposer({
  stage,
  providerOptions,
  modelOptions,
  authModeOptions,
  oauthMethods,
  selectedProviderId,
  selectedModelId,
  selectedAuthMode,
  selectedOauthMethodId,
  isStartingOauth,
  canStartOauth,
  oauthConnectLabel,
  hasProviderCredential,
  hasAuthError,
  onSelectProvider,
  onSelectModel,
  onSelectAuthMode,
  onSelectOauthMethod,
  onStartOauth,
  onContinueToIntent,
  onRefreshCredentialStatus,
  onSaveManualCredential,
  isSavingManualCredential,
  isRefreshingCredential,
}: BusinessOnboardingOptionComposerProps) {
  const [query, setQuery] = useState('');

  const providerResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return providerOptions;
    return providerOptions.filter((option) => {
      const text = `${option.label} ${option.providerId}`.toLowerCase();
      return text.includes(normalized);
    });
  }, [providerOptions, query]);

  const modelResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return modelOptions;
    return modelOptions.filter((option) => {
      const text =
        `${option.label} ${option.id} ${option.description ?? ''} ${option.group}`.toLowerCase();
      return text.includes(normalized);
    });
  }, [modelOptions, query]);

  const authModeResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return authModeOptions;
    return authModeOptions.filter((option) =>
      `${option.id} ${option.label}`.toLowerCase().includes(normalized),
    );
  }, [authModeOptions, query]);

  if (stage === 'authenticate' || stage === 'auth_ready') {
    return (
      <div className="space-y-3">
        {selectedAuthMode === 'oauth-access-token' && (
          <div className="space-y-2">
            {oauthMethods.length > 0 && (
              <PromptInputSelect
                value={selectedOauthMethodId}
                onValueChange={(value) => onSelectOauthMethod(value as string)}
              >
                <PromptInputSelectTrigger className="w-full">
                  <PromptInputSelectValue placeholder="Choose OAuth method" />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {oauthMethods.map((method) => (
                    <PromptInputSelectItem key={method.id} value={method.id}>
                      {method.label}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={onStartOauth}
                disabled={!canStartOauth || isStartingOauth}
              >
                {isStartingOauth ? 'Opening OAuth...' : oauthConnectLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onRefreshCredentialStatus}
                disabled={isRefreshingCredential}
              >
                {isRefreshingCredential
                  ? 'Refreshing...'
                  : 'Refresh credential status'}
              </Button>
            </div>
          </div>
        )}

        {selectedAuthMode !== 'oauth-access-token' && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onSaveManualCredential}
              disabled={isSavingManualCredential}
            >
              {isSavingManualCredential ? 'Saving...' : 'Save credential'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onRefreshCredentialStatus}
              disabled={isRefreshingCredential}
            >
              {isRefreshingCredential
                ? 'Refreshing...'
                : 'Refresh credential status'}
            </Button>
          </div>
        )}

        <Button
          type="button"
          variant={hasProviderCredential ? 'default' : 'secondary'}
          disabled={!hasProviderCredential && !hasAuthError}
          onClick={onContinueToIntent}
          className="w-full"
        >
          Continue to business intent chat
        </Button>
      </div>
    );
  }

  const isProviderStage = stage === 'select_provider';
  const isModelStage = stage === 'select_model';
  const isAuthModeStage = stage === 'select_auth_method';

  return (
    <div className="space-y-2">
      <PromptInputCommand className="rounded-lg border bg-background">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <PromptInputCommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={
              isProviderStage
                ? 'Search providers'
                : isModelStage
                  ? 'Search models'
                  : 'Search auth methods'
            }
          />
        </div>

        <PromptInputCommandList>
          <PromptInputCommandEmpty>
            No matching options.
          </PromptInputCommandEmpty>

          {isProviderStage && (
            <PromptInputCommandGroup heading="Providers">
              {providerResults.map((option) => {
                const isSelected = option.providerId === selectedProviderId;
                return (
                  <PromptInputCommandItem
                    key={option.providerId}
                    value={`${option.label} ${option.providerId}`}
                    onSelect={() => onSelectProvider(option.providerId)}
                    className="cursor-pointer"
                  >
                    <div className="flex w-full items-center gap-2">
                      <ProviderLogo
                        providerId={option.providerId}
                        label={option.label}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{option.label}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {option.providerId}
                        </p>
                      </div>
                      <div className="hidden items-center gap-1 sm:flex">
                        {option.supportedAuthModes.map((mode) => (
                          <Badge
                            key={`${option.providerId}-${mode}`}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {authModeBadgeLabel(mode)}
                          </Badge>
                        ))}
                      </div>
                      <Check
                        className={cn(
                          'h-4 w-4 text-primary',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </div>
                  </PromptInputCommandItem>
                );
              })}
            </PromptInputCommandGroup>
          )}

          {isModelStage && (
            <PromptInputCommandGroup heading="Models">
              {modelResults.map((option) => {
                const isSelected = option.id === selectedModelId;
                return (
                  <PromptInputCommandItem
                    key={option.id}
                    value={`${option.label} ${option.id} ${option.group}`}
                    onSelect={() => onSelectModel(option.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex w-full items-center gap-2">
                      <ProviderLogo
                        providerId={option.providerId}
                        label={option.label}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{option.label}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {option.id}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {modelGroupLabel(option.group)}
                      </Badge>
                      <Check
                        className={cn(
                          'h-4 w-4 text-primary',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </div>
                  </PromptInputCommandItem>
                );
              })}
            </PromptInputCommandGroup>
          )}

          {isAuthModeStage && (
            <PromptInputCommandGroup heading="Authentication methods">
              {authModeResults.map((option) => {
                const isSelected = option.id === selectedAuthMode;
                return (
                  <PromptInputCommandItem
                    key={option.id}
                    value={`${option.label} ${option.id}`}
                    onSelect={() => onSelectAuthMode(option.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex w-full items-center gap-2">
                      <div className="flex-1">
                        <p className="text-sm">{option.label}</p>
                      </div>
                      <Check
                        className={cn(
                          'h-4 w-4 text-primary',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </div>
                  </PromptInputCommandItem>
                );
              })}
            </PromptInputCommandGroup>
          )}
        </PromptInputCommandList>
      </PromptInputCommand>
    </div>
  );
}
