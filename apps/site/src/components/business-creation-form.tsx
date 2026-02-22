import { Link } from '@tanstack/react-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  type AssistantAuthMode,
  BUSINESS_ONBOARDING_MODEL_OPTIONS,
  type BusinessOnboardingModelOption,
  type BusinessOnboardingProviderId,
  DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  PROVIDER_SUPPORTED_AUTH_MODES,
  resolveAssistantModelOption,
  resolveProviderDefaultAuthMode,
  resolveProviderDefaultBaseUrl,
  resolveProviderSupportedAuthModes,
} from '@/lib/ai/business-onboarding-models';
import { api } from '@/lib/api';
import { mergeSelectedReleaseIds } from '@/lib/business-ai-assistant';
import type { PluginReleaseDoc } from '@/lib/plugins/types';
import { businessSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { getBusinessCreationAssistantTurn } from '@/server-functions/ai';
import { BusinessOnboardingChat } from './business-onboarding-chat';
import {
  businessOnboardingSessionReducer,
  createInitialBusinessOnboardingSession,
} from './business-onboarding-chat-state';
import { MapField } from './ui/autoform/components/MapField';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

export const businessCreationSchema = businessSchema
  .pick({
    name: true,
    features: true,
    locationCoordinates: true,
  })
  .extend({
    name: z.string().trim().min(1, 'Business name is required'),
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

interface StepTwoFormProps {
  form: UseFormReturn<BusinessCreationValues>;
}

interface StepThreeFormProps {
  form: UseFormReturn<BusinessCreationValues>;
}

const providerLabelById: Partial<Record<string, string>> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  'github-copilot': 'GitHub Copilot',
  bedrock: 'AWS Bedrock',
  'amazon-bedrock': 'AWS Bedrock',
  openrouter: 'OpenRouter',
  opencode: 'OpenCode Zen',
  groq: 'Groq',
  together: 'Together AI',
  togetherai: 'Together AI',
  deepseek: 'DeepSeek',
  xai: 'xAI',
  mistral: 'Mistral',
  requesty: 'Requesty',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  'custom-openai-compatible': 'Custom OpenAI-compatible',
};

const modelsDevProviderLogoOverrides: Record<string, string> = {
  bedrock: 'amazon-bedrock',
  together: 'togetherai',
  ollama: 'ollama-cloud',
  'custom-openai-compatible': 'openai',
};

function resolveModelsDevProviderId(providerId: string): string {
  return modelsDevProviderLogoOverrides[providerId] ?? providerId;
}

const authModeLabelById: Record<AssistantAuthMode, string> = {
  'api-key': 'API key',
  'oauth-access-token': 'OAuth access token',
  'aws-credential-chain': 'AWS credential chain',
  none: 'No auth',
};

type ProviderOauthMethodOption = {
  id: string;
  label: string;
  buttonLabel: string;
};

type ProviderAuthMethodApiItem = {
  id?: string;
  type?: 'api' | 'oauth';
  label?: string;
};

type ModelsDevModelRecord = {
  id?: string;
  name?: string;
  family?: string;
  release_date?: string;
};

type ModelsDevProviderRecord = {
  id?: string;
  models?: Record<string, ModelsDevModelRecord>;
};

const OPENAI_BROWSER_OAUTH_METHOD_ID = 'openai-chatgpt-pro-plus-browser';
const OPENAI_HEADLESS_OAUTH_METHOD_ID = 'openai-chatgpt-pro-plus-headless';
const GOOGLE_ANTIGRAVITY_OAUTH_METHOD_ID = 'google-antigravity-oauth';
const OPENROUTER_ACCOUNT_OAUTH_METHOD_ID = 'openrouter-account-oauth';
const GITHUB_COPILOT_DEVICE_OAUTH_METHOD_ID = 'github-copilot-device-oauth';

const fallbackProviderOauthMethodsByProviderId: Partial<
  Record<string, readonly ProviderOauthMethodOption[]>
> = {
  openai: [
    {
      id: OPENAI_BROWSER_OAUTH_METHOD_ID,
      label: 'ChatGPT Plus/Pro (Browser OAuth)',
      buttonLabel: 'Connect ChatGPT Plus/Pro',
    },
    {
      id: OPENAI_HEADLESS_OAUTH_METHOD_ID,
      label: 'ChatGPT Plus/Pro (Headless Device OAuth)',
      buttonLabel: 'Connect ChatGPT Plus/Pro (Device)',
    },
  ],
  google: [
    {
      id: GOOGLE_ANTIGRAVITY_OAUTH_METHOD_ID,
      label: 'Google OAuth (Antigravity)',
      buttonLabel: 'Connect Google (Antigravity)',
    },
  ],
  openrouter: [
    {
      id: OPENROUTER_ACCOUNT_OAUTH_METHOD_ID,
      label: 'OpenRouter account OAuth',
      buttonLabel: 'Connect OpenRouter account',
    },
  ],
  'github-copilot': [
    {
      id: GITHUB_COPILOT_DEVICE_OAUTH_METHOD_ID,
      label: 'GitHub Copilot device OAuth',
      buttonLabel: 'Connect GitHub Copilot',
    },
  ],
};

function resolveDefaultProviderOauthMethodId(
  providerOauthMethods: readonly ProviderOauthMethodOption[],
): string | undefined {
  return providerOauthMethods[0]?.id;
}

function resolveProviderOauthMethods(
  providerId: string,
): readonly ProviderOauthMethodOption[] {
  return fallbackProviderOauthMethodsByProviderId[providerId] ?? [];
}

function resolveProviderOauthButtonLabel(input: {
  methods: readonly ProviderOauthMethodOption[];
  methodId?: string;
}): string {
  const selectedMethod = input.methods.find(
    (method) => method.id === input.methodId,
  );
  return selectedMethod?.buttonLabel ?? 'Connect OAuth provider';
}

function resolveProviderOauthButtonLabelForMethod(
  method: ProviderAuthMethodApiItem,
): string {
  const id = method.id?.trim() ?? '';
  if (id === OPENAI_BROWSER_OAUTH_METHOD_ID) return 'Connect ChatGPT Plus/Pro';
  if (id === OPENAI_HEADLESS_OAUTH_METHOD_ID) {
    return 'Connect ChatGPT Plus/Pro (Device)';
  }
  if (id === GOOGLE_ANTIGRAVITY_OAUTH_METHOD_ID) {
    return 'Connect Google (Antigravity)';
  }
  if (id === OPENROUTER_ACCOUNT_OAUTH_METHOD_ID) {
    return 'Connect OpenRouter account';
  }
  if (id === GITHUB_COPILOT_DEVICE_OAUTH_METHOD_ID) {
    return 'Connect GitHub Copilot';
  }

  const label = method.label?.trim();
  return label ? `Connect ${label}` : 'Connect OAuth provider';
}

function normalizeProviderOauthMethodOptions(
  providerId: string,
  methods: ProviderAuthMethodApiItem[],
): ProviderOauthMethodOption[] {
  const normalized: ProviderOauthMethodOption[] = [];
  for (const method of methods) {
    const id = method.id?.trim();
    if (!id || method.type !== 'oauth' || id === 'oauth-access-token') {
      continue;
    }
    normalized.push({
      id,
      label: method.label?.trim() || id,
      buttonLabel: resolveProviderOauthButtonLabelForMethod(method),
    });
  }

  return normalized.length > 0
    ? normalized
    : [...resolveProviderOauthMethods(providerId)];
}

function formatProviderLabel(providerId: string): string {
  const fromMap = providerLabelById[providerId];
  if (fromMap) return fromMap;
  return providerId
    .split('-')
    .filter(Boolean)
    .map((chunk) => `${chunk[0]?.toUpperCase() ?? ''}${chunk.slice(1)}`)
    .join(' ');
}

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
  if (step === 4) {
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
        <div className="space-y-6">
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

      {step === 2 && <BusinessOnboardingAssistantForm form={form} />}

      {step === 3 && (
        <div className="space-y-6 rounded-2xl border border-border/70 bg-background p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Chapter 3 · Plugin Browser
              </p>
              <p className="mt-1 text-sm text-foreground">
                Browse and choose plugins before launch. AI suggestions are
                pre-selected from Step 2.
              </p>
            </div>
          </div>
          <BusinessPluginSelectionStep form={form} />
        </div>
      )}
    </div>
  );
}

function BusinessOnboardingAssistantForm({ form }: StepTwoFormProps) {
  const defaultModelOption = resolveAssistantModelOption(
    DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  );

  const [session, dispatch] = useReducer(
    businessOnboardingSessionReducer,
    createInitialBusinessOnboardingSession({
      selectedProviderId: defaultModelOption.provider,
      selectedModelId: defaultModelOption.id,
      selectedAuthMode: resolveProviderDefaultAuthMode(
        defaultModelOption.provider,
      ),
      oauthMethodId:
        resolveDefaultProviderOauthMethodId(
          resolveProviderOauthMethods(defaultModelOption.provider),
        ) ?? '',
    }),
  );

  const [providerApiKey, setProviderApiKey] = useState('');
  const [providerOauthAccessToken, setProviderOauthAccessToken] = useState('');
  const [providerBaseUrl, setProviderBaseUrl] = useState(
    resolveProviderDefaultBaseUrl(defaultModelOption.provider) ?? '',
  );
  const [providerRegion, setProviderRegion] = useState('');
  const [providerOrganization, setProviderOrganization] = useState('');
  const [providerProject, setProviderProject] = useState('');
  const [providerCredentialSavedAt, setProviderCredentialSavedAt] = useState<
    number | null
  >(null);
  const [authSessionExpiresAt, setAuthSessionExpiresAt] = useState<
    number | null
  >(null);
  const [providerOauthMethods, setProviderOauthMethods] = useState<
    readonly ProviderOauthMethodOption[]
  >(() => resolveProviderOauthMethods(defaultModelOption.provider));
  const [modelsDevCatalogByProviderId, setModelsDevCatalogByProviderId] =
    useState<Record<string, ModelsDevProviderRecord>>({});
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [thread, setThread] = useState<
    Array<{ id: string; role: 'assistant' | 'user'; content: string }>
  >([]);
  const [quickOptions, setQuickOptions] = useState<string[]>([
    'Describe my daily workflow',
    'List my top pain points',
    'Focus on customer experience',
  ]);
  const [showAdvancedAuthDetails, setShowAdvancedAuthDetails] = useState(false);
  const [isSavingProviderCredential, setIsSavingProviderCredential] =
    useState(false);
  const [isRefreshingProviderCredential, setIsRefreshingProviderCredential] =
    useState(false);
  const [isStartingProviderOauth, setIsStartingProviderOauth] = useState(false);
  const [isCreatingAuthSession, setIsCreatingAuthSession] = useState(false);
  const [isRevokingAuthSession, setIsRevokingAuthSession] = useState(false);

  const stagePromptRef = useRef<string>('');

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

  const businessOnboardingChatAuthV1 =
    import.meta.env.VITE_BUSINESS_ONBOARDING_CHAT_AUTH_V1 !== '0';

  const appendStatusLine = useCallback((line: string) => {
    setStatusLines((current) => [...current, line]);
  }, []);

  const appendAssistantMessage = useCallback((content: string) => {
    setThread((current) => [
      ...current,
      {
        id: `assistant-${current.length + 1}`,
        role: 'assistant',
        content,
      },
    ]);
  }, []);

  const appendUserMessage = useCallback((content: string) => {
    setThread((current) => [
      ...current,
      {
        id: `user-${current.length + 1}`,
        role: 'user',
        content,
      },
    ]);
  }, []);

  const providerOptions = useMemo(
    () =>
      Object.keys(PROVIDER_SUPPORTED_AUTH_MODES)
        .sort((a, b) =>
          formatProviderLabel(a).localeCompare(formatProviderLabel(b)),
        )
        .map((providerId) => ({
          providerId,
          label: formatProviderLabel(providerId),
          supportedAuthModes: resolveProviderSupportedAuthModes(providerId),
        })),
    [],
  );

  const resolveProviderModelOptions = useCallback(
    (providerId: string): BusinessOnboardingModelOption[] => {
      const modelsDevProviderId = resolveModelsDevProviderId(providerId);
      const modelsRecord =
        modelsDevCatalogByProviderId[modelsDevProviderId]?.models ?? {};
      const modelsFromModelsDev = Object.values(modelsRecord)
        .filter(
          (model): model is ModelsDevModelRecord & { id: string } =>
            typeof model.id === 'string' && model.id.trim().length > 0,
        )
        .map((model) => ({
          id: model.id.trim(),
          label: model.name?.trim() || model.id.trim(),
          provider: providerId,
          defaultAuthMode: resolveProviderDefaultAuthMode(providerId),
          description: model.family?.trim(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      if (modelsFromModelsDev.length > 0) {
        return modelsFromModelsDev;
      }

      return BUSINESS_ONBOARDING_MODEL_OPTIONS.filter(
        (option) => option.provider === providerId,
      );
    },
    [modelsDevCatalogByProviderId],
  );

  const providerModelOptions = useMemo(
    () => resolveProviderModelOptions(session.selectedProviderId),
    [resolveProviderModelOptions, session.selectedProviderId],
  );

  const defaultModelIdForProvider = providerModelOptions[0]?.id;
  const selectedModel =
    providerModelOptions.find(
      (model) => model.id === session.selectedModelId,
    ) ?? providerModelOptions[0];

  const modelOptions = useMemo(() => {
    const preferredIds = new Set(
      BUSINESS_ONBOARDING_MODEL_OPTIONS.filter(
        (option) => option.provider === session.selectedProviderId,
      ).map((option) => option.id),
    );

    return providerModelOptions.map((model) => ({
      group:
        model.id === defaultModelIdForProvider
          ? ('default' as const)
          : preferredIds.has(model.id)
            ? ('preferred' as const)
            : ('custom' as const),
      id: model.id,
      label: model.label,
      description: model.description,
      providerId: session.selectedProviderId,
    }));
  }, [
    providerModelOptions,
    session.selectedProviderId,
    defaultModelIdForProvider,
  ]);

  const selectedProviderOption =
    providerOptions.find(
      (provider) => provider.providerId === session.selectedProviderId,
    ) ?? providerOptions[0];

  const supportedAuthModes = resolveProviderSupportedAuthModes(
    session.selectedProviderId,
  );

  const authModeOptions = supportedAuthModes.map((mode) => ({
    id: mode,
    label: authModeLabelById[mode],
  }));

  const selectedProviderOauthMethods = providerOauthMethods;
  const resolvedProviderOauthMethodId = selectedProviderOauthMethods.some(
    (method) => method.id === session.oauthMethodId,
  )
    ? session.oauthMethodId
    : resolveDefaultProviderOauthMethodId(selectedProviderOauthMethods);

  const selectedProviderOauthButtonLabel = resolveProviderOauthButtonLabel({
    methods: selectedProviderOauthMethods,
    methodId: resolvedProviderOauthMethodId,
  });

  const canStartProviderOauth =
    session.selectedAuthMode === 'oauth-access-token' &&
    Boolean(resolvedProviderOauthMethodId);

  const selectedAuthModeLabel = authModeLabelById[session.selectedAuthMode];

  useEffect(() => {
    let cancelled = false;

    async function loadModelsDevCatalog() {
      try {
        const response = await fetch('https://models.dev/api.json');
        if (!response.ok) return;
        const payload = (await response.json()) as Record<
          string,
          ModelsDevProviderRecord
        >;
        if (cancelled) return;
        setModelsDevCatalogByProviderId(payload);
      } catch {
        // keep static fallback model options when models.dev is unavailable
      }
    }

    void loadModelsDevCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fallbackMethods = resolveProviderOauthMethods(
      session.selectedProviderId,
    );
    setProviderOauthMethods(fallbackMethods);

    async function loadProviderOauthMethods() {
      try {
        const response = await fetch(
          `/v1/auth/providers/methods?providerId=${encodeURIComponent(session.selectedProviderId)}`,
          {
            credentials: 'include',
          },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          methods?: ProviderAuthMethodApiItem[];
        };
        if (cancelled) return;

        const normalized = normalizeProviderOauthMethodOptions(
          session.selectedProviderId,
          payload.methods ?? [],
        );
        setProviderOauthMethods(normalized);

        const resolvedMethod =
          normalized.find((method) => method.id === session.oauthMethodId)
            ?.id ??
          resolveDefaultProviderOauthMethodId(normalized) ??
          '';
        dispatch({
          type: 'select_oauth_method',
          oauthMethodId: resolvedMethod,
        });
      } catch {
        if (cancelled) return;
        setProviderOauthMethods(fallbackMethods);
        const fallbackId =
          resolveDefaultProviderOauthMethodId(fallbackMethods) ?? '';
        dispatch({ type: 'select_oauth_method', oauthMethodId: fallbackId });
      }
    }

    void loadProviderOauthMethods();

    return () => {
      cancelled = true;
    };
  }, [session.selectedProviderId, session.oauthMethodId]);

  useEffect(() => {
    const prompt =
      session.stage === 'select_provider'
        ? "Let's choose your AI provider. Pick one option below."
        : session.stage === 'select_model'
          ? 'Now choose the model for this provider.'
          : session.stage === 'select_auth_method'
            ? 'Choose how this provider should authenticate.'
            : session.stage === 'authenticate'
              ? 'Connect or save credentials. OAuth opens in a new tab automatically.'
              : session.stage === 'auth_ready'
                ? 'Authentication looks ready. Continue to the intent chat when you are ready.'
                : "Describe the business and I'll recommend plugins; you can still move to Step 3 anytime.";

    if (stagePromptRef.current === `${session.stage}:${prompt}`) {
      return;
    }

    appendAssistantMessage(prompt);
    stagePromptRef.current = `${session.stage}:${prompt}`;
  }, [appendAssistantMessage, session.stage]);

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
      providerId: session.selectedProviderId,
      model: session.selectedModelId,
      authMode: session.selectedAuthMode,
    };

    const trimmedBaseUrl = providerBaseUrl.trim();
    if (trimmedBaseUrl.length > 0) {
      payload.baseURL = trimmedBaseUrl;
    }

    const trimmedApiKey = providerApiKey.trim();
    if (session.selectedAuthMode === 'api-key' && trimmedApiKey.length > 0) {
      payload.apiKey = trimmedApiKey;
    }

    const trimmedOauthAccessToken = providerOauthAccessToken.trim();
    if (
      session.selectedAuthMode === 'oauth-access-token' &&
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

  async function refreshStoredProviderCredential(): Promise<boolean> {
    setIsRefreshingProviderCredential(true);
    try {
      const response = await fetch('/v1/auth/providers', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) return false;
      const parsed = (await response.json()) as {
        data?: Array<{
          providerId?: string;
          model?: string;
          authMode?: AssistantAuthMode;
          updatedAt?: number;
        }>;
      };
      const match = parsed.data?.find(
        (item) => item.providerId === session.selectedProviderId,
      );
      if (!match) {
        setProviderCredentialSavedAt(null);
        dispatch({
          type: 'set_auth_error',
          message: 'No saved credential found yet.',
        });
        return false;
      }
      const validatedAt =
        typeof match.updatedAt === 'number'
          ? match.updatedAt * 1000
          : Date.now();
      setProviderCredentialSavedAt(validatedAt);
      dispatch({ type: 'set_last_validated_at', at: validatedAt });
      dispatch({ type: 'oauth_connected', at: validatedAt });
      appendStatusLine('Credential detected for selected provider.');
      return true;
    } catch {
      return false;
    } finally {
      setIsRefreshingProviderCredential(false);
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
      !payload.oauthAccessToken &&
      session.selectedAuthMode === 'oauth-access-token'
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
        const errorMessage = await readErrorMessage(response);
        dispatch({ type: 'oauth_failed', message: errorMessage });
        toast.error(errorMessage);
        return;
      }

      const now = Date.now();
      setProviderCredentialSavedAt(now);
      dispatch({ type: 'oauth_connected', at: now });
      dispatch({ type: 'clear_auth_session' });
      dispatch({ type: 'set_auth_error', message: '' });
      setAuthSessionExpiresAt(null);
      appendStatusLine('Credential saved for selected provider.');

      if (payload.authMode === 'api-key') {
        setProviderApiKey('');
      }
      if (payload.authMode === 'oauth-access-token') {
        setProviderOauthAccessToken('');
      }

      toast.success('Provider credentials saved for this signed-in session.');
    } catch {
      dispatch({
        type: 'oauth_failed',
        message: 'Failed to save provider credentials.',
      });
      toast.error('Failed to save provider credentials.');
    } finally {
      setIsSavingProviderCredential(false);
    }
  }

  async function createAuthSession(): Promise<string | null> {
    const hasStoredCredential =
      providerCredentialSavedAt || (await refreshStoredProviderCredential());
    const payload = buildProviderPayload();
    const hasInlineSecret = Boolean(payload.apiKey || payload.oauthAccessToken);
    const requestBody =
      hasInlineSecret || !hasStoredCredential
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
        return null;
      }

      const parsed = (await response.json()) as {
        sessionToken?: string;
        expiresAt?: number;
      };
      if (!parsed.sessionToken) {
        toast.error('Session token was not returned.');
        return null;
      }

      dispatch({ type: 'set_auth_session_token', token: parsed.sessionToken });
      setAuthSessionExpiresAt(parsed.expiresAt ?? null);
      appendStatusLine('Auth session token created.');
      return parsed.sessionToken;
    } catch {
      toast.error('Failed to create auth session.');
      return null;
    } finally {
      setIsCreatingAuthSession(false);
    }
  }

  async function revokeAuthSession() {
    if (!session.authSessionToken) return;

    setIsRevokingAuthSession(true);
    try {
      const response = await fetch('/v1/auth/sessions', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          authorization: `Bearer ${session.authSessionToken}`,
        },
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response));
        return;
      }

      dispatch({ type: 'clear_auth_session' });
      setAuthSessionExpiresAt(null);
      appendStatusLine('Auth session revoked.');
      toast.success('Auth session revoked.');
    } catch {
      toast.error('Failed to revoke auth session.');
    } finally {
      setIsRevokingAuthSession(false);
    }
  }

  async function startProviderOauth() {
    if (!resolvedProviderOauthMethodId) return;
    const providerLabel = formatProviderLabel(session.selectedProviderId);
    const trimmedProject = providerProject.trim();
    const wait = (milliseconds: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, milliseconds);
      });

    dispatch({
      type: 'oauth_started',
      authorizationUrl: '',
      verificationCode: '',
    });
    appendStatusLine('Preparing secure authorization link...');
    setIsStartingProviderOauth(true);
    try {
      const response = await fetch('/v1/auth/providers/oauth/authorize', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          providerId: session.selectedProviderId,
          methodId: resolvedProviderOauthMethodId,
          model: session.selectedModelId,
          projectId:
            session.selectedProviderId === 'google' && trimmedProject
              ? trimmedProject
              : undefined,
        }),
      });
      if (!response.ok) {
        const errorMessage = await readErrorMessage(response);
        dispatch({ type: 'oauth_failed', message: errorMessage });
        toast.error(errorMessage);
        return;
      }
      const parsed = (await response.json()) as {
        authorizationUrl?: string;
        method?: string;
        verificationCode?: string;
        pollingIntervalSeconds?: number;
      };
      if (!parsed.authorizationUrl) {
        dispatch({
          type: 'oauth_failed',
          message: 'Authorization URL was not returned.',
        });
        toast.error('OAuth authorization URL was not returned.');
        return;
      }

      dispatch({
        type: 'oauth_started',
        authorizationUrl: parsed.authorizationUrl,
        verificationCode: parsed.verificationCode,
      });
      appendStatusLine('OAuth link opened in a new tab.');

      const opened = window.open(
        parsed.authorizationUrl,
        '_blank',
        'noopener,noreferrer',
      );
      if (!opened) {
        const blockedMessage =
          'Popup/new-tab blocked. Use the fallback secure OAuth link in chat.';
        dispatch({ type: 'set_auth_error', message: blockedMessage });
        appendStatusLine(blockedMessage);
        toast.message('Popup blocked. Open OAuth using the secure link.');
        return;
      }

      const responseMethodId = parsed.method ?? resolvedProviderOauthMethodId;
      const isDevicePollingOauth =
        responseMethodId === OPENAI_HEADLESS_OAUTH_METHOD_ID ||
        responseMethodId === GITHUB_COPILOT_DEVICE_OAUTH_METHOD_ID;
      const pollingIntervalSeconds = Number.isFinite(
        parsed.pollingIntervalSeconds,
      )
        ? Math.max(1, Math.floor(parsed.pollingIntervalSeconds ?? 0))
        : 5;

      if (isDevicePollingOauth) {
        const maxPollAttempts = 120;
        for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
          const callbackResponse = await fetch(
            '/v1/auth/providers/oauth/callback',
            {
              method: 'POST',
              credentials: 'include',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({}),
            },
          );

          if (callbackResponse.status === 202) {
            const retryAfterHeader =
              callbackResponse.headers.get('Retry-After');
            const retryAfterSeconds = Number.parseInt(
              retryAfterHeader ?? '',
              10,
            );
            const nextWaitSeconds = Number.isFinite(retryAfterSeconds)
              ? Math.max(1, retryAfterSeconds)
              : pollingIntervalSeconds;
            appendStatusLine(
              `Waiting for authorization confirmation... checking again in ${nextWaitSeconds}s.`,
            );
            await wait(nextWaitSeconds * 1000);
            continue;
          }

          if (!callbackResponse.ok) {
            const errorMessage = await readErrorMessage(callbackResponse);
            dispatch({ type: 'oauth_failed', message: errorMessage });
            appendStatusLine('OAuth callback failed.');
            toast.error(errorMessage);
            return;
          }

          const refreshed = await refreshStoredProviderCredential();
          if (refreshed) {
            const now = Date.now();
            dispatch({ type: 'oauth_connected', at: now });
            dispatch({ type: 'set_stage', stage: 'auth_ready' });
            appendStatusLine(`${providerLabel} OAuth credential connected.`);
            toast.success(`${providerLabel} OAuth credential connected.`);
          } else {
            appendStatusLine(
              'OAuth completed. Credential not visible yet; refresh status.',
            );
          }
          return;
        }

        dispatch({
          type: 'oauth_failed',
          message:
            'Timed out waiting for device authorization. Restart OAuth to retry.',
        });
        toast.error('Timed out waiting for device authorization to complete.');
        return;
      }

      appendStatusLine('Waiting for OAuth callback completion...');

      const maxPollAttempts = 45;
      for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
        const refreshed = await refreshStoredProviderCredential();
        if (refreshed) {
          const now = Date.now();
          dispatch({ type: 'oauth_connected', at: now });
          dispatch({ type: 'set_stage', stage: 'auth_ready' });
          appendStatusLine(`${providerLabel} OAuth credential connected.`);
          toast.success(`${providerLabel} OAuth credential connected.`);
          return;
        }
        await wait(2000);
      }

      appendStatusLine(
        'OAuth started. Refresh credential status if still pending.',
      );
    } catch {
      dispatch({
        type: 'oauth_failed',
        message: `Failed to start ${providerLabel} OAuth.`,
      });
      toast.error(`Failed to start ${providerLabel} OAuth.`);
    } finally {
      setIsStartingProviderOauth(false);
    }
  }

  const handleSelectProvider = useCallback(
    (providerId: string) => {
      const nextModels = resolveProviderModelOptions(providerId);
      const nextModelId =
        nextModels.find((model) => model.id === session.selectedModelId)?.id ??
        nextModels[0]?.id ??
        session.selectedModelId;
      const fallbackOauthMethods = resolveProviderOauthMethods(providerId);
      const defaultOauthMethodId =
        resolveDefaultProviderOauthMethodId(fallbackOauthMethods) ?? '';

      dispatch({
        type: 'select_provider',
        providerId,
        defaultAuthMode: resolveProviderDefaultAuthMode(providerId),
        modelId: nextModelId,
        oauthMethodId: defaultOauthMethodId,
      });

      setProviderOauthMethods(fallbackOauthMethods);
      setProviderBaseUrl(resolveProviderDefaultBaseUrl(providerId) ?? '');
      setProviderCredentialSavedAt(null);
      setProviderApiKey('');
      setProviderOauthAccessToken('');
      setProviderRegion('');
      setProviderOrganization('');
      setProviderProject('');
      setAuthSessionExpiresAt(null);
      appendUserMessage(`Provider: ${formatProviderLabel(providerId)}`);
      appendStatusLine(
        `Provider selected: ${formatProviderLabel(providerId)}.`,
      );
    },
    [
      appendStatusLine,
      appendUserMessage,
      resolveProviderModelOptions,
      session.selectedModelId,
    ],
  );

  const handleSelectModel = useCallback(
    (modelId: string) => {
      dispatch({ type: 'select_model', modelId });
      appendUserMessage(`Model: ${modelId}`);
      appendStatusLine(`Model selected: ${modelId}.`);
    },
    [appendStatusLine, appendUserMessage],
  );

  const handleSelectAuthMode = useCallback(
    (authMode: AssistantAuthMode) => {
      dispatch({ type: 'select_auth_mode', authMode });
      dispatch({ type: 'reset_oauth_state' });
      appendUserMessage(`Auth method: ${authModeLabelById[authMode]}`);
      appendStatusLine(`Auth method selected: ${authModeLabelById[authMode]}.`);
    },
    [appendStatusLine, appendUserMessage],
  );

  const handleSelectOauthMethod = useCallback(
    (oauthMethodId: string) => {
      dispatch({ type: 'select_oauth_method', oauthMethodId });
      const methodLabel =
        selectedProviderOauthMethods.find(
          (method) => method.id === oauthMethodId,
        )?.label ?? oauthMethodId;
      appendUserMessage(`OAuth method: ${methodLabel}`);
      appendStatusLine(`OAuth method selected: ${methodLabel}.`);
    },
    [appendStatusLine, appendUserMessage, selectedProviderOauthMethods],
  );

  async function goToBusinessIntent() {
    if (session.stage !== 'auth_ready' && session.stage !== 'authenticate') {
      return;
    }

    if (!session.authSessionToken && providerCredentialSavedAt) {
      await createAuthSession();
    }

    dispatch({ type: 'set_stage', stage: 'business_intent' });
    appendAssistantMessage(
      'Tell me how this business operates day-to-day. I will recommend plugins and preselect matches for Step 3.',
    );
  }

  async function handleBusinessIntentSubmit(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    if (thread.at(-1)?.role !== 'user' || thread.at(-1)?.content !== trimmed) {
      appendUserMessage(trimmed);
    }

    try {
      const selectedReleaseIds =
        form.getValues('selectedPluginReleaseIds') ?? [];
      const response = await getBusinessCreationAssistantTurn({
        data: {
          userPrompt: trimmed,
          model: session.selectedModelId,
          provider: buildProviderPayload(),
          authSessionToken: session.authSessionToken || undefined,
          selectedReleaseIds,
          availableReleaseIds,
          onboardingStage: session.stage,
          providerSelectionContext: {
            providerId: session.selectedProviderId,
            modelId: session.selectedModelId,
            authMode: session.selectedAuthMode,
          },
          conversationHistory: thread.slice(-8).map((message) => ({
            role: message.role,
            content: message.content,
          })),
        },
      });

      appendAssistantMessage(response.assistantMessage);
      setQuickOptions([...response.quickOptions.options]);

      if (response.suggestedReleaseIds.length > 0) {
        const mergedSelection = mergeSelectedReleaseIds(
          selectedReleaseIds,
          response.suggestedReleaseIds,
        );
        form.setValue('selectedPluginReleaseIds', mergedSelection, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
        appendStatusLine(
          `Preselected ${response.suggestedReleaseIds.length} plugin recommendation(s) for Step 3.`,
        );
      }
    } catch {
      appendAssistantMessage(
        'I could not fetch a recommendation right now, but you can continue to Step 3 and pick plugins manually.',
      );
    }
  }

  function handleQuickOption(value: string) {
    appendUserMessage(value);
    void handleBusinessIntentSubmit(value);
  }

  const manualAuthPanel = (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => setShowAdvancedAuthDetails((current) => !current)}
      >
        {showAdvancedAuthDetails
          ? 'Hide advanced auth details'
          : 'Advanced auth details'}
      </Button>

      {showAdvancedAuthDetails && (
        <div className="space-y-2">
          {session.selectedAuthMode === 'api-key' && (
            <Input
              type="password"
              placeholder="API key"
              value={providerApiKey}
              onChange={(event) => setProviderApiKey(event.target.value)}
            />
          )}

          {session.selectedAuthMode === 'oauth-access-token' && (
            <Input
              type="password"
              placeholder="OAuth access token (optional manual fallback)"
              value={providerOauthAccessToken}
              onChange={(event) =>
                setProviderOauthAccessToken(event.target.value)
              }
            />
          )}

          {session.selectedAuthMode === 'aws-credential-chain' && (
            <Input
              placeholder="AWS region (optional)"
              value={providerRegion}
              onChange={(event) => setProviderRegion(event.target.value)}
            />
          )}

          <Input
            placeholder="Base URL (optional override)"
            value={providerBaseUrl}
            onChange={(event) => setProviderBaseUrl(event.target.value)}
          />

          {session.selectedProviderId === 'openai' && (
            <>
              <Input
                placeholder="Organization (optional)"
                value={providerOrganization}
                onChange={(event) =>
                  setProviderOrganization(event.target.value)
                }
              />
              <Input
                placeholder="Project (optional)"
                value={providerProject}
                onChange={(event) => setProviderProject(event.target.value)}
              />
            </>
          )}

          {session.selectedProviderId === 'google' && (
            <Input
              placeholder="Google project (optional)"
              value={providerProject}
              onChange={(event) => setProviderProject(event.target.value)}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={saveProviderCredential}
              disabled={isSavingProviderCredential}
            >
              {isSavingProviderCredential ? 'Saving...' : 'Save credential'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void createAuthSession();
              }}
              disabled={isCreatingAuthSession}
            >
              {isCreatingAuthSession
                ? 'Creating session...'
                : 'Create auth session'}
            </Button>
            {session.authSessionToken && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={revokeAuthSession}
                disabled={isRevokingAuthSession}
              >
                {isRevokingAuthSession ? 'Revoking...' : 'Revoke auth session'}
              </Button>
            )}
          </div>

          {session.authSessionToken && (
            <p className="text-[11px] text-muted-foreground break-all">
              Session token: {session.authSessionToken.slice(0, 18)}...
              {session.authSessionToken.slice(-10)}
              {authSessionExpiresAt
                ? ` (expires at ${new Date(authSessionExpiresAt * 1000).toLocaleTimeString()})`
                : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (!businessOnboardingChatAuthV1) {
    return (
      <div className="rounded-lg border bg-background/60 p-4 space-y-3">
        <p className="text-sm font-medium">AI Integration</p>
        <p className="text-xs text-muted-foreground">
          Legacy Step 2 is active. Set `VITE_BUSINESS_ONBOARDING_CHAT_AUTH_V1=1`
          to enable conversational auth picker flow.
        </p>
      </div>
    );
  }

  return (
    <BusinessOnboardingChat
      stage={session.stage}
      thread={thread}
      statusLines={statusLines}
      selectedProviderLabel={
        selectedProviderOption?.label ?? 'Unknown provider'
      }
      selectedModelLabel={selectedModel?.label ?? session.selectedModelId}
      selectedAuthModeLabel={selectedAuthModeLabel}
      oauthState={session.oauthState}
      authError={session.authError}
      oauthAuthorizationUrl={session.oauthAuthorizationUrl}
      manualAuthPanel={manualAuthPanel}
      providerOptions={providerOptions}
      modelOptions={modelOptions}
      authModeOptions={authModeOptions}
      oauthMethods={selectedProviderOauthMethods}
      selectedProviderId={session.selectedProviderId}
      selectedModelId={session.selectedModelId}
      selectedAuthMode={session.selectedAuthMode}
      selectedOauthMethodId={resolvedProviderOauthMethodId ?? ''}
      isStartingOauth={isStartingProviderOauth}
      canStartOauth={canStartProviderOauth}
      oauthConnectLabel={selectedProviderOauthButtonLabel}
      hasProviderCredential={Boolean(providerCredentialSavedAt)}
      hasAuthError={Boolean(session.authError)}
      onSelectProvider={handleSelectProvider}
      onSelectModel={handleSelectModel}
      onSelectAuthMode={handleSelectAuthMode}
      onSelectOauthMethod={handleSelectOauthMethod}
      onStartOauth={startProviderOauth}
      onContinueToIntent={goToBusinessIntent}
      onRefreshCredentialStatus={refreshStoredProviderCredential}
      onSaveManualCredential={saveProviderCredential}
      isSavingManualCredential={isSavingProviderCredential}
      isRefreshingCredential={isRefreshingProviderCredential}
      quickOptions={quickOptions}
      onPickQuickOption={handleQuickOption}
      onSubmitBusinessIntent={(value) => {
        void handleBusinessIntentSubmit(value);
      }}
    />
  );
}
function BusinessPluginSelectionStep({ form }: StepThreeFormProps) {
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const [query, setQuery] = useState('');
  const releases = useMemo(
    () => releaseRows as PluginReleaseDoc[],
    [releaseRows],
  );

  return (
    <FormField
      control={form.control}
      name="selectedPluginReleaseIds"
      render={({ field }) => {
        const selectedReleaseIds = field.value ?? [];
        const selectedReleaseIdSet = new Set(selectedReleaseIds);
        const normalizedQuery = query.trim().toLowerCase();

        const filteredReleases = releases.filter((release) => {
          if (!normalizedQuery) return true;
          const releaseId = toReleaseId(release.pluginId, release.version);
          const docs = release.docs as
            | ({ title?: string; description?: string } & Record<
                string,
                unknown
              >)
            | undefined;
          const searchText = [
            releaseId,
            release.pluginId,
            release.version,
            docs?.title,
            docs?.description,
          ]
            .filter(
              (value): value is string =>
                typeof value === 'string' && value.trim().length > 0,
            )
            .join(' ')
            .toLowerCase();
          return searchText.includes(normalizedQuery);
        });

        const orderedReleases = [...filteredReleases].sort((a, b) => {
          const aReleaseId = toReleaseId(a.pluginId, a.version);
          const bReleaseId = toReleaseId(b.pluginId, b.version);
          const aSelected = selectedReleaseIdSet.has(aReleaseId);
          const bSelected = selectedReleaseIdSet.has(bReleaseId);
          if (aSelected !== bSelected) return aSelected ? -1 : 1;
          return aReleaseId.localeCompare(bReleaseId);
        });

        return (
          <FormItem className="space-y-4">
            <div className="space-y-4 rounded-lg border bg-background/60 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Plugin Browser</p>
                <p className="text-xs text-muted-foreground">
                  Search plugins by name, id, or version. Any items selected by
                  the AI in Step 2 are already selected here.
                </p>
              </div>

              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search plugins by name, id, or version"
              />

              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-medium text-foreground">
                  Selected for installation ({selectedReleaseIds.length})
                </p>
                {selectedReleaseIds.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No plugins selected. Pick at least one plugin to continue to
                    business creation.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
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

              <ScrollArea className="h-[26rem] rounded-md border bg-muted/5 p-3">
                <div className="space-y-2">
                  {orderedReleases.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No plugins match your search.
                    </p>
                  ) : (
                    orderedReleases.map((release) => {
                      const releaseId = toReleaseId(
                        release.pluginId,
                        release.version,
                      );
                      const docs = release.docs as
                        | ({ title?: string; description?: string } & Record<
                            string,
                            unknown
                          >)
                        | undefined;
                      const title = docs?.title?.trim() || release.pluginId;
                      const description =
                        docs?.description?.trim() ||
                        'No description provided for this release.';
                      const isSelected = selectedReleaseIdSet.has(releaseId);

                      return (
                        <div
                          key={releaseId}
                          className={cn(
                            'rounded-lg border p-3',
                            isSelected
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border bg-background',
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {releaseId}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {description}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={isSelected ? 'secondary' : 'outline'}
                              onClick={() => {
                                if (isSelected) {
                                  field.onChange(
                                    selectedReleaseIds.filter(
                                      (current) => current !== releaseId,
                                    ),
                                  );
                                  return;
                                }
                                field.onChange([
                                  ...selectedReleaseIds,
                                  releaseId,
                                ]);
                              }}
                            >
                              {isSelected ? 'Selected' : 'Select plugin'}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
