import { Link } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  SendHorizontal,
  Sparkles,
} from 'lucide-react';
import { type KeyboardEvent, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  type AssistantAuthMode,
  BUSINESS_ONBOARDING_MODEL_OPTIONS,
  type BusinessOnboardingProviderId,
  DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  PROVIDER_SUPPORTED_AUTH_MODES,
  resolveAssistantModelOption,
  resolveProviderDefaultAuthMode,
  resolveProviderDefaultBaseUrl,
} from '@/lib/ai/business-onboarding-models';
import { api } from '@/lib/api';
import {
  type AssistantQuickOptionSet,
  deriveTodoProgress,
  mergeSelectedReleaseIds,
  type TodoItem,
} from '@/lib/business-ai-assistant';
import type { PluginReleaseDoc } from '@/lib/plugins/types';
import { businessSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { getBusinessCreationAssistantTurn } from '@/server-functions/ai';
import { MapField } from './ui/autoform/components/MapField';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const businessCreationSchema = businessSchema
  .pick({
    name: true,
    features: true,
    locationCoordinates: true,
  })
  .extend({
    prepopulateData: z.record(z.string(), z.boolean()).optional(),
    selectedPluginReleaseIds: z.array(z.string()),
  });

export type BusinessCreationValues = z.infer<typeof businessCreationSchema>;

interface BusinessCreationFormProps {
  step: number;
  form: UseFormReturn<BusinessCreationValues>;
  setStep: (step: number) => void;
  createdBusiness: z.infer<typeof businessSchema> | undefined;
  isSubmitting: boolean;
}

interface AssistantMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface StepTwoFormProps {
  form: UseFormReturn<BusinessCreationValues>;
}

const starterQuickOptions: AssistantQuickOptionSet = {
  questionId: 'business-basics',
  prompt: 'Pick a quick start, or type your own in the chip.',
  options: ['I run a restaurant', 'I run a salon', 'I run a retail shop'],
  otherOptionLabel: 'Type custom follow-up',
};

const starterTodoItems: TodoItem[] = [
  {
    id: 'business-kind',
    title: 'Understand what business you are creating',
    done: false,
  },
  {
    id: 'business-operations',
    title: 'Capture what the business does day-to-day',
    done: false,
  },
  {
    id: 'setup-plan',
    title: 'Draft an optional setup plan for launch',
    done: false,
  },
];

const providerLabelById: Record<BusinessOnboardingProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  bedrock: 'AWS Bedrock',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  together: 'Together AI',
  deepseek: 'DeepSeek',
  xai: 'xAI',
  mistral: 'Mistral',
  requesty: 'Requesty',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  'custom-openai-compatible': 'Custom OpenAI-compatible',
};

const authModeLabelById: Record<AssistantAuthMode, string> = {
  'api-key': 'API key',
  'oauth-access-token': 'OAuth access token',
  'aws-credential-chain': 'AWS credential chain',
  none: 'No auth',
};

function toReleaseId(pluginId: string, version: string) {
  return `${pluginId}@${version}`;
}

function getReleaseIdTitle(releaseId: string) {
  const [pluginId, version] = releaseId.split('@');
  if (!pluginId || !version) return releaseId;
  return `${pluginId}@${version}`;
}

export function BusinessCreationForm({
  step,
  form,
  setStep: _setStep,
  isSubmitting: _isSubmitting,
  createdBusiness,
}: BusinessCreationFormProps) {
  if (step === 3) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">Business Created!</h2>
        {createdBusiness && (
          <div className="mt-4 space-y-4">
            <p className="text-lg font-semibold">
              Your business{' '}
              <span className="text-primary">{createdBusiness.name}</span> is
              now online!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link
                  to="/$businessName"
                  params={{ businessName: createdBusiness.basePath ?? '' }}
                >
                  Go to Public Site
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  to="/$businessName/admin"
                  params={{ businessName: createdBusiness.basePath ?? '' }}
                >
                  Go to Admin Dashboard
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link
                  to="/$businessName/admin/plugins"
                  params={{ businessName: createdBusiness.basePath ?? '' }}
                >
                  Open Plugin Manager
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {step === 1 && (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Aangan Restaurant" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locationCoordinates"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Set Location on Map</FormLabel>
                <FormControl>
                  {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
                  <MapField
                    {...field}
                    label="Set Location on Map"
                    // MapField consumes AutoFormFieldProps, but this route uses it in a RHF form.
                    field={{} as never}
                    path={['locationCoordinates']}
                    inputProps={{
                      key: 'locationCoordinates',
                      onChange: field.onChange,
                      value: field.value,
                    }}
                    id="locationCoordinates"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <BusinessOnboardingAssistantForm form={form} />
        </div>
      )}
    </div>
  );
}

function BusinessOnboardingAssistantForm({ form }: StepTwoFormProps) {
  const defaultModelOption = resolveAssistantModelOption(
    DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  );

  const [assistantInput, setAssistantInput] = useState('');
  const [customQuickPrompt, setCustomQuickPrompt] = useState('');
  const [todoExpanded, setTodoExpanded] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedAssistantProviderId, setSelectedAssistantProviderId] =
    useState<BusinessOnboardingProviderId>(defaultModelOption.provider);
  const [selectedAssistantModelId, setSelectedAssistantModelId] = useState(
    defaultModelOption.id,
  );
  const [selectedAssistantAuthMode, setSelectedAssistantAuthMode] =
    useState<AssistantAuthMode>(() =>
      resolveProviderDefaultAuthMode(defaultModelOption.provider),
    );
  const [providerApiKey, setProviderApiKey] = useState('');
  const [providerOauthAccessToken, setProviderOauthAccessToken] = useState('');
  const [providerBaseUrl, setProviderBaseUrl] = useState(
    resolveProviderDefaultBaseUrl(defaultModelOption.provider) ?? '',
  );
  const [providerRegion, setProviderRegion] = useState('');
  const [providerOrganization, setProviderOrganization] = useState('');
  const [providerProject, setProviderProject] = useState('');
  const [isSavingProviderCredential, setIsSavingProviderCredential] =
    useState(false);
  const [isCreatingAuthSession, setIsCreatingAuthSession] = useState(false);
  const [isRevokingAuthSession, setIsRevokingAuthSession] = useState(false);
  const [providerCredentialSavedAt, setProviderCredentialSavedAt] = useState<
    number | null
  >(null);
  const [authSessionToken, setAuthSessionToken] = useState('');
  const [authSessionExpiresAt, setAuthSessionExpiresAt] = useState<
    number | null
  >(null);

  const [assistantMessages, setAssistantMessages] = useState<
    AssistantMessage[]
  >([
    {
      role: 'assistant',
      content:
        'What kind of business are you creating? Tell me what it does day-to-day so I can draft your launch setup.',
    },
  ]);
  const [quickOptions, setQuickOptions] =
    useState<AssistantQuickOptionSet>(starterQuickOptions);
  const [assistantTodoItems, setAssistantTodoItems] =
    useState<TodoItem[]>(starterTodoItems);

  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const releases = useMemo(
    () => releaseRows as PluginReleaseDoc[],
    [releaseRows],
  );
  const availableReleaseIds = useMemo(
    () =>
      releases.map((release) => toReleaseId(release.pluginId, release.version)),
    [releases],
  );
  const providerOptions = useMemo(
    () =>
      (
        Object.keys(
          PROVIDER_SUPPORTED_AUTH_MODES,
        ) as BusinessOnboardingProviderId[]
      ).map((providerId) => ({
        providerId,
        label: providerLabelById[providerId] ?? providerId,
      })),
    [],
  );
  const providerModelOptions = useMemo(
    () =>
      BUSINESS_ONBOARDING_MODEL_OPTIONS.filter(
        (option) => option.provider === selectedAssistantProviderId,
      ),
    [selectedAssistantProviderId],
  );
  const selectedModelOption = useMemo(
    () =>
      providerModelOptions.find(
        (option) => option.id === selectedAssistantModelId,
      ) ??
      providerModelOptions[0] ??
      resolveAssistantModelOption(DEFAULT_BUSINESS_ONBOARDING_MODEL_ID),
    [providerModelOptions, selectedAssistantModelId],
  );
  const supportedAuthModes =
    PROVIDER_SUPPORTED_AUTH_MODES[selectedAssistantProviderId];

  const todoProgress = deriveTodoProgress(assistantTodoItems);

  function buildProviderPayload() {
    const payload: {
      providerId: BusinessOnboardingProviderId;
      model: string;
      authMode: AssistantAuthMode;
      apiKey?: string;
      oauthAccessToken?: string;
      baseURL?: string;
      region?: string;
      organization?: string;
      project?: string;
    } = {
      providerId: selectedAssistantProviderId,
      model: selectedAssistantModelId,
      authMode: selectedAssistantAuthMode,
    };

    const trimmedBaseUrl = providerBaseUrl.trim();
    if (trimmedBaseUrl.length > 0) {
      payload.baseURL = trimmedBaseUrl;
    }

    const trimmedApiKey = providerApiKey.trim();
    if (selectedAssistantAuthMode === 'api-key' && trimmedApiKey.length > 0) {
      payload.apiKey = trimmedApiKey;
    }

    const trimmedOauthAccessToken = providerOauthAccessToken.trim();
    if (
      selectedAssistantAuthMode === 'oauth-access-token' &&
      trimmedOauthAccessToken.length > 0
    ) {
      payload.oauthAccessToken = trimmedOauthAccessToken;
    }

    const trimmedRegion = providerRegion.trim();
    if (trimmedRegion.length > 0) {
      payload.region = trimmedRegion;
    }

    const trimmedOrganization = providerOrganization.trim();
    if (trimmedOrganization.length > 0) {
      payload.organization = trimmedOrganization;
    }

    const trimmedProject = providerProject.trim();
    if (trimmedProject.length > 0) {
      payload.project = trimmedProject;
    }

    return payload;
  }

  async function readErrorMessage(response: Response) {
    try {
      const parsed = (await response.json()) as {
        error?: {
          message?: string;
        };
      };
      return parsed.error?.message || `Request failed (${response.status})`;
    } catch {
      return `Request failed (${response.status})`;
    }
  }

  async function saveProviderCredential() {
    const payload = buildProviderPayload();

    if (payload.authMode === 'api-key' && !payload.apiKey) {
      toast.error('Enter an API key before saving.');
      return;
    }
    if (
      payload.authMode === 'oauth-access-token' &&
      !payload.oauthAccessToken
    ) {
      toast.error('Enter an OAuth access token before saving.');
      return;
    }

    setIsSavingProviderCredential(true);
    try {
      const response = await fetch('/v1/auth/providers', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response));
        return;
      }

      setProviderCredentialSavedAt(Date.now());
      setAuthSessionToken('');
      setAuthSessionExpiresAt(null);
      if (payload.authMode === 'api-key') {
        setProviderApiKey('');
      }
      if (payload.authMode === 'oauth-access-token') {
        setProviderOauthAccessToken('');
      }
      toast.success('Provider credentials saved for this signed-in session.');
    } catch {
      toast.error('Failed to save provider credentials.');
    } finally {
      setIsSavingProviderCredential(false);
    }
  }

  async function createAuthSession() {
    const payload = buildProviderPayload();
    const hasInlineSecret = Boolean(payload.apiKey || payload.oauthAccessToken);
    const requestBody =
      hasInlineSecret || !providerCredentialSavedAt
        ? {
            provider: payload,
            ttlSeconds: 3600,
          }
        : {
            providerId: payload.providerId,
            model: payload.model,
            ttlSeconds: 3600,
          };

    setIsCreatingAuthSession(true);
    try {
      const response = await fetch('/v1/auth/sessions', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response));
        return;
      }

      const parsed = (await response.json()) as {
        sessionToken?: string;
        expiresAt?: number;
      };
      if (!parsed.sessionToken) {
        toast.error('Session token was not returned.');
        return;
      }

      setAuthSessionToken(parsed.sessionToken);
      setAuthSessionExpiresAt(parsed.expiresAt ?? null);
      toast.success('Auth session created for OpenAPI-compatible calls.');
    } catch {
      toast.error('Failed to create auth session.');
    } finally {
      setIsCreatingAuthSession(false);
    }
  }

  async function revokeAuthSession() {
    if (!authSessionToken) return;

    setIsRevokingAuthSession(true);
    try {
      const response = await fetch('/v1/auth/sessions', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          authorization: `Bearer ${authSessionToken}`,
        },
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response));
        return;
      }

      setAuthSessionToken('');
      setAuthSessionExpiresAt(null);
      toast.success('Auth session revoked.');
    } catch {
      toast.error('Failed to revoke auth session.');
    } finally {
      setIsRevokingAuthSession(false);
    }
  }

  function handleProviderChange(nextProviderIdValue: string) {
    const nextProviderId = nextProviderIdValue as BusinessOnboardingProviderId;
    const nextModelOptions = BUSINESS_ONBOARDING_MODEL_OPTIONS.filter(
      (option) => option.provider === nextProviderId,
    );

    setSelectedAssistantProviderId(nextProviderId);
    setSelectedAssistantAuthMode(
      resolveProviderDefaultAuthMode(nextProviderId),
    );
    setProviderBaseUrl(resolveProviderDefaultBaseUrl(nextProviderId) ?? '');
    setProviderCredentialSavedAt(null);
    setAuthSessionToken('');
    setAuthSessionExpiresAt(null);
    setSelectedAssistantModelId((currentModel) =>
      nextModelOptions.some((option) => option.id === currentModel)
        ? currentModel
        : (nextModelOptions[0]?.id ?? currentModel),
    );
  }

  return (
    <FormField
      control={form.control}
      name="selectedPluginReleaseIds"
      render={({ field }) => {
        const selectedReleaseIds = field.value ?? [];

        async function runAssistant(prompt: string) {
          const trimmedPrompt = prompt.trim();
          if (!trimmedPrompt || isThinking) return;

          const nextConversationHistory = [
            ...assistantMessages,
            { role: 'user' as const, content: trimmedPrompt },
          ];

          setAssistantMessages(nextConversationHistory);
          setAssistantInput('');
          setCustomQuickPrompt('');
          setIsThinking(true);

          try {
            const response = await getBusinessCreationAssistantTurn({
              data: {
                userPrompt: trimmedPrompt,
                model: selectedAssistantModelId,
                provider: buildProviderPayload(),
                authSessionToken: authSessionToken || undefined,
                selectedReleaseIds,
                availableReleaseIds,
                conversationHistory: nextConversationHistory,
              },
            });

            const mergedReleaseIds = mergeSelectedReleaseIds(
              selectedReleaseIds,
              response.suggestedReleaseIds,
            );

            field.onChange(mergedReleaseIds);
            setQuickOptions(response.quickOptions);
            setAssistantTodoItems(response.todoItems);
            setAssistantMessages((current) => [
              ...current,
              { role: 'assistant', content: response.assistantMessage },
            ]);

            const addedCount =
              mergedReleaseIds.length - selectedReleaseIds.length;
            if (addedCount > 0) {
              toast.success(
                `AI updated your setup plan with ${addedCount} optional plugin${addedCount === 1 ? '' : 's'}.`,
              );
            }

            if (response.scaffoldProposal) {
              toast.message(
                `Drafted scaffold idea: ${response.scaffoldProposal.title}`,
              );
            }
          } catch {
            toast.error('Assistant request failed. Please try again.');
          } finally {
            setIsThinking(false);
          }
        }

        function handleMessageInputKeyDown(
          event: KeyboardEvent<HTMLInputElement>,
        ) {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            runAssistant(assistantInput);
            return;
          }

          if (event.altKey && ['1', '2', '3'].includes(event.key)) {
            event.preventDefault();
            const optionIndex = Number(event.key) - 1;
            const option = quickOptions.options[optionIndex];
            if (option) runAssistant(option);
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            runAssistant(assistantInput);
          }
        }

        return (
          <FormItem className="space-y-4">
            <div className="rounded-lg border bg-background/60 p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">AI Business Onboarding</p>
                  <p className="text-xs text-muted-foreground">
                    Chat-first setup. Press Ctrl/Cmd+Enter to send and Alt+1/2/3
                    for quick options.
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {selectedModelOption.label}
                </Badge>
              </div>

              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">
                  Choose provider auth and model. Credentials can be stored in
                  an encrypted HttpOnly cookie, then reused without retyping.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <FormLabel className="text-xs text-muted-foreground">
                      AI provider
                    </FormLabel>
                    <Select
                      value={selectedAssistantProviderId}
                      onValueChange={handleProviderChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerOptions.map((option) => (
                          <SelectItem
                            key={option.providerId}
                            value={option.providerId}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <FormLabel className="text-xs text-muted-foreground">
                      AI model
                    </FormLabel>
                    {providerModelOptions.length > 0 ? (
                      <Select
                        value={selectedAssistantModelId}
                        onValueChange={(value) => {
                          setSelectedAssistantModelId(value);
                          setAuthSessionToken('');
                          setAuthSessionExpiresAt(null);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose model" />
                        </SelectTrigger>
                        <SelectContent>
                          {providerModelOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Model id (e.g., gpt-4o-mini)"
                        value={selectedAssistantModelId}
                        onChange={(event) =>
                          setSelectedAssistantModelId(event.target.value)
                        }
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <FormLabel className="text-xs text-muted-foreground">
                      Auth mode
                    </FormLabel>
                    <Select
                      value={selectedAssistantAuthMode}
                      onValueChange={(value) => {
                        setSelectedAssistantAuthMode(
                          value as AssistantAuthMode,
                        );
                        setProviderCredentialSavedAt(null);
                        setAuthSessionToken('');
                        setAuthSessionExpiresAt(null);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose auth mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedAuthModes.map((authMode) => (
                          <SelectItem key={authMode} value={authMode}>
                            {authModeLabelById[authMode]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <FormLabel className="text-xs text-muted-foreground">
                      Base URL (optional override)
                    </FormLabel>
                    <Input
                      placeholder="https://api.openai.com/v1"
                      value={providerBaseUrl}
                      onChange={(event) =>
                        setProviderBaseUrl(event.target.value)
                      }
                    />
                  </div>

                  {selectedAssistantAuthMode === 'api-key' && (
                    <div className="space-y-1 md:col-span-2">
                      <FormLabel className="text-xs text-muted-foreground">
                        API key
                      </FormLabel>
                      <Input
                        type="password"
                        placeholder="sk-..."
                        value={providerApiKey}
                        onChange={(event) =>
                          setProviderApiKey(event.target.value)
                        }
                      />
                    </div>
                  )}

                  {selectedAssistantAuthMode === 'oauth-access-token' && (
                    <div className="space-y-1 md:col-span-2">
                      <FormLabel className="text-xs text-muted-foreground">
                        OAuth access token
                      </FormLabel>
                      <Input
                        type="password"
                        placeholder="Bearer token"
                        value={providerOauthAccessToken}
                        onChange={(event) =>
                          setProviderOauthAccessToken(event.target.value)
                        }
                      />
                    </div>
                  )}

                  {selectedAssistantProviderId === 'bedrock' && (
                    <div className="space-y-1">
                      <FormLabel className="text-xs text-muted-foreground">
                        AWS region
                      </FormLabel>
                      <Input
                        placeholder="us-east-1"
                        value={providerRegion}
                        onChange={(event) =>
                          setProviderRegion(event.target.value)
                        }
                      />
                    </div>
                  )}

                  {selectedAssistantProviderId === 'openai' && (
                    <>
                      <div className="space-y-1">
                        <FormLabel className="text-xs text-muted-foreground">
                          Organization (optional)
                        </FormLabel>
                        <Input
                          placeholder="org_..."
                          value={providerOrganization}
                          onChange={(event) =>
                            setProviderOrganization(event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <FormLabel className="text-xs text-muted-foreground">
                          Project (optional)
                        </FormLabel>
                        <Input
                          placeholder="proj_..."
                          value={providerProject}
                          onChange={(event) =>
                            setProviderProject(event.target.value)
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={saveProviderCredential}
                    disabled={isSavingProviderCredential}
                  >
                    {isSavingProviderCredential
                      ? 'Saving...'
                      : 'Save credential'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={createAuthSession}
                    disabled={isCreatingAuthSession}
                  >
                    {isCreatingAuthSession
                      ? 'Creating session...'
                      : 'Create auth session'}
                  </Button>
                  {authSessionToken && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={revokeAuthSession}
                      disabled={isRevokingAuthSession}
                    >
                      {isRevokingAuthSession
                        ? 'Revoking...'
                        : 'Revoke auth session'}
                    </Button>
                  )}
                  {providerCredentialSavedAt && (
                    <Badge variant="outline" className="text-xs">
                      Credential saved
                    </Badge>
                  )}
                  {authSessionToken && (
                    <Badge variant="secondary" className="text-xs">
                      Session token active
                    </Badge>
                  )}
                </div>
                {authSessionToken && (
                  <p className="text-[11px] text-muted-foreground break-all">
                    Session token: {authSessionToken.slice(0, 18)}...
                    {authSessionToken.slice(-10)}
                    {authSessionExpiresAt
                      ? ` (expires at ${new Date(
                          authSessionExpiresAt * 1000,
                        ).toLocaleTimeString()})`
                      : ''}
                  </p>
                )}
              </div>

              <Collapsible open={todoExpanded} onOpenChange={setTodoExpanded}>
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Assistant progress
                      </p>
                      <p className="text-sm font-medium truncate">
                        {todoProgress === 100
                          ? 'Ready to create business'
                          : assistantTodoItems.find((item) => !item.done)
                              ?.title}
                      </p>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        {todoExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <Progress value={todoProgress} className="h-2" />
                  <CollapsibleContent className="space-y-2 pt-1">
                    {assistantTodoItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <span
                          className={cn(
                            'inline-block h-2 w-2 rounded-full',
                            item.done ? 'bg-green-500' : 'bg-amber-500',
                          )}
                        />
                        {item.title}
                      </div>
                    ))}
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {quickOptions.prompt}
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickOptions.options.map((option, index) => (
                    <Button
                      key={option}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => runAssistant(option)}
                    >
                      <span className="text-[10px] text-muted-foreground mr-1">
                        {index + 1}.
                      </span>
                      {option}
                    </Button>
                  ))}
                  <div className="inline-flex h-8 items-center gap-1 rounded-full border bg-background px-2">
                    <Input
                      value={customQuickPrompt}
                      onChange={(event) =>
                        setCustomQuickPrompt(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          runAssistant(customQuickPrompt);
                        }
                      }}
                      placeholder={quickOptions.otherOptionLabel}
                      className="h-6 w-40 border-0 bg-transparent px-1 text-xs focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => runAssistant(customQuickPrompt)}
                      disabled={
                        customQuickPrompt.trim().length === 0 || isThinking
                      }
                    >
                      <SendHorizontal className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-52 rounded-md border bg-muted/10 p-3">
                <div className="space-y-2">
                  {assistantMessages.slice(-12).map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={cn(
                        'flex',
                        message.role === 'assistant'
                          ? 'justify-start'
                          : 'justify-end',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[90%] rounded-2xl px-3 py-2 text-xs',
                          message.role === 'assistant'
                            ? 'bg-muted text-foreground'
                            : 'bg-primary text-primary-foreground',
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  onKeyDown={handleMessageInputKeyDown}
                  placeholder="Describe your business and what it does."
                />
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => runAssistant(assistantInput)}
                  disabled={isThinking || assistantInput.trim().length === 0}
                >
                  <Sparkles className="h-4 w-4" />
                  Send
                </Button>
              </div>

              <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">
                  AI-selected setup plan (optional)
                </p>
                {selectedReleaseIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    The assistant will add optional plugins only when needed.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedReleaseIds.map((releaseId) => (
                      <Badge
                        key={releaseId}
                        variant="outline"
                        className="gap-2 py-1"
                      >
                        {getReleaseIdTitle(releaseId)}
                        <button
                          type="button"
                          className="rounded-sm px-1 text-muted-foreground hover:bg-muted"
                          onClick={() =>
                            field.onChange(
                              selectedReleaseIds.filter(
                                (current) => current !== releaseId,
                              ),
                            )
                          }
                        >
                          x
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
