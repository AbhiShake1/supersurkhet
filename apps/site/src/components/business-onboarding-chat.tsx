import { Bot, CircleAlert, CircleCheckBig, LoaderCircle } from 'lucide-react';
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Badge } from '@/components/ui/badge';
import type { AssistantAuthMode } from '@/lib/ai/business-onboarding-models';
import { cn } from '@/lib/utils';
import type { BusinessOnboardingStage } from './business-onboarding-chat-state';
import {
  BusinessOnboardingOptionComposer,
  type OptionAuthModeItem,
  type OptionModelItem,
  type OptionOauthMethodItem,
  type OptionProviderItem,
} from './business-onboarding-option-composer';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  id: string;
}

interface BusinessOnboardingChatProps {
  stage: BusinessOnboardingStage;
  thread: readonly ChatMessage[];
  statusLines: readonly string[];
  selectedProviderLabel: string;
  selectedModelLabel: string;
  selectedAuthModeLabel: string;
  oauthState: 'idle' | 'pending' | 'connected' | 'error';
  authError: string;
  oauthAuthorizationUrl: string;
  manualAuthPanel: React.ReactNode;
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
  quickOptions: readonly string[];
  onPickQuickOption: (value: string) => void;
  onSubmitBusinessIntent: (value: string) => void;
}

function stageTitle(stage: BusinessOnboardingStage): string {
  if (stage === 'select_provider') return 'Pick an AI provider';
  if (stage === 'select_model') return 'Pick a model';
  if (stage === 'select_auth_method') return 'Pick an auth method';
  if (stage === 'authenticate') return 'Connect or save credential';
  if (stage === 'auth_ready') return 'Auth ready';
  return 'Describe your business intent';
}

export function BusinessOnboardingChat({
  stage,
  thread,
  statusLines,
  selectedProviderLabel,
  selectedModelLabel,
  selectedAuthModeLabel,
  oauthState,
  authError,
  oauthAuthorizationUrl,
  manualAuthPanel,
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
  quickOptions,
  onPickQuickOption,
  onSubmitBusinessIntent,
}: BusinessOnboardingChatProps) {
  const showsPickerComposer =
    stage === 'select_provider' ||
    stage === 'select_model' ||
    stage === 'select_auth_method' ||
    stage === 'authenticate' ||
    stage === 'auth_ready';

  const authStatusTone = oauthState === 'connected' ? 'secondary' : 'outline';

  return (
    <section className="rounded-2xl border border-border/70 bg-background p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Chapter 2 · BYO AI
          </p>
          <p className="mt-1 text-sm font-medium">{stageTitle(stage)}</p>
        </div>
        <Badge variant="outline">{stage}</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-h-[28rem] rounded-xl border bg-muted/10">
          <Conversation className="h-full">
            <ConversationContent className="gap-3 p-3">
              {thread.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    <MessageResponse>{message.content}</MessageResponse>
                  </MessageContent>
                </Message>
              ))}

              {stage === 'business_intent' && quickOptions.length > 0 && (
                <div className="pt-1">
                  <Suggestions>
                    {quickOptions.map((option) => (
                      <Suggestion
                        key={option}
                        suggestion={option}
                        onClick={onPickQuickOption}
                      />
                    ))}
                  </Suggestions>
                </div>
              )}

              {authError && (
                <div className="rounded-md border border-red-500/40 bg-red-500/5 p-2 text-xs text-red-700">
                  {authError}
                </div>
              )}

              {oauthAuthorizationUrl && oauthState !== 'connected' && (
                <div className="rounded-md border border-border bg-background p-2 text-xs">
                  OAuth tab blocked? Open this link manually:{' '}
                  <a
                    href={oauthAuthorizationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Secure OAuth page
                  </a>
                </div>
              )}
            </ConversationContent>
          </Conversation>
        </div>

        <aside className="space-y-2 rounded-xl border bg-muted/10 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bot className="h-4 w-4" />
            Session snapshot
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Provider: {selectedProviderLabel}</p>
            <p>Model: {selectedModelLabel}</p>
            <p>Auth: {selectedAuthModeLabel}</p>
          </div>

          <Badge
            variant={authStatusTone}
            className={cn(
              'gap-1',
              oauthState === 'pending' && 'animate-pulse',
              oauthState === 'error' && 'border-red-500/50 text-red-600',
            )}
          >
            {oauthState === 'connected' ? (
              <CircleCheckBig className="h-3.5 w-3.5" />
            ) : oauthState === 'error' ? (
              <CircleAlert className="h-3.5 w-3.5" />
            ) : oauthState === 'pending' ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {oauthState === 'connected'
              ? 'Connected'
              : oauthState === 'error'
                ? 'Action needed'
                : oauthState === 'pending'
                  ? 'Waiting for OAuth'
                  : 'Not connected'}
          </Badge>

          {statusLines.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {statusLines.slice(-4).map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          )}

          {(stage === 'authenticate' || stage === 'auth_ready') &&
            manualAuthPanel}
        </aside>
      </div>

      <div className="mt-3 border-t pt-3">
        {showsPickerComposer ? (
          <BusinessOnboardingOptionComposer
            stage={stage}
            providerOptions={providerOptions}
            modelOptions={modelOptions}
            authModeOptions={authModeOptions}
            oauthMethods={oauthMethods}
            selectedProviderId={selectedProviderId}
            selectedModelId={selectedModelId}
            selectedAuthMode={selectedAuthMode}
            selectedOauthMethodId={selectedOauthMethodId}
            isStartingOauth={isStartingOauth}
            canStartOauth={canStartOauth}
            oauthConnectLabel={oauthConnectLabel}
            hasProviderCredential={hasProviderCredential}
            hasAuthError={hasAuthError}
            onSelectProvider={onSelectProvider}
            onSelectModel={onSelectModel}
            onSelectAuthMode={onSelectAuthMode}
            onSelectOauthMethod={onSelectOauthMethod}
            onStartOauth={onStartOauth}
            onContinueToIntent={onContinueToIntent}
            onRefreshCredentialStatus={onRefreshCredentialStatus}
            onSaveManualCredential={onSaveManualCredential}
            isSavingManualCredential={isSavingManualCredential}
            isRefreshingCredential={isRefreshingCredential}
          />
        ) : (
          <PromptInput
            onSubmit={({ text }) => {
              const trimmed = text.trim();
              if (!trimmed) return;
              onSubmitBusinessIntent(trimmed);
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea placeholder="Describe what this business does every day..." />
            </PromptInputBody>
            <PromptInputFooter>
              <span className="pl-1 text-xs text-muted-foreground">
                AI auth is optional. This chat improves recommendations.
              </span>
              <PromptInputSubmit status="ready" />
            </PromptInputFooter>
          </PromptInput>
        )}
      </div>
    </section>
  );
}
