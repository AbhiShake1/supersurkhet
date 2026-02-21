import { Link } from '@tanstack/react-router';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  resolveProviderSupportedAuthModes,
} from '@/lib/ai/business-onboarding-models';
import { api } from '@/lib/api';
import type { PluginReleaseDoc } from '@/lib/plugins/types';
import { businessSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { MapField } from './ui/autoform/components/MapField';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
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

const MODELS_DEV_PROVIDER_LOGO_BASE_URL = 'https://models.dev/logos/';
const modelsDevProviderLogoOverrides: Record<string, string> = {
  bedrock: 'amazon-bedrock',
  together: 'togetherai',
  ollama: 'ollama-cloud',
  'custom-openai-compatible': 'openai',
};

function resolveModelsDevProviderLogoUrl(providerId: string): string {
  const normalizedProviderId =
    modelsDevProviderLogoOverrides[providerId] ?? providerId;
  return `${MODELS_DEV_PROVIDER_LOGO_BASE_URL}${encodeURIComponent(
    normalizedProviderId,
  )}.svg`;
}

function ProviderLogo({
  providerId,
  label,
  className,
}: {
  providerId: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-background',
        className,
      )}
    >
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

      {step === 2 && (
        <BusinessOnboardingAssistantForm form={form} />
      )}

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

function BusinessOnboardingAssistantForm({ form: _form }: StepTwoFormProps) {
  const defaultModelOption = resolveAssistantModelOption(
    DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  );

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isProviderComboboxOpen, setIsProviderComboboxOpen] = useState(false);
  const [isModelComboboxOpen, setIsModelComboboxOpen] = useState(false);
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
  const [providerOauthMethods, setProviderOauthMethods] = useState<
    readonly ProviderOauthMethodOption[]
  >(() => resolveProviderOauthMethods(defaultModelOption.provider));
  const [selectedProviderOauthMethodId, setSelectedProviderOauthMethodId] =
    useState(
      () =>
        resolveDefaultProviderOauthMethodId(
          resolveProviderOauthMethods(defaultModelOption.provider),
        ) ?? '',
    );
  const [isSavingProviderCredential, setIsSavingProviderCredential] =
    useState(false);
  const [isRefreshingProviderCredential, setIsRefreshingProviderCredential] =
    useState(false);
  const [isStartingProviderOauth, setIsStartingProviderOauth] = useState(false);
  const [isCreatingAuthSession, setIsCreatingAuthSession] = useState(false);
  const [isRevokingAuthSession, setIsRevokingAuthSession] = useState(false);
  const [providerCredentialSavedAt, setProviderCredentialSavedAt] = useState<
    number | null
  >(null);
  const [authSessionToken, setAuthSessionToken] = useState('');
  const [authSessionExpiresAt, setAuthSessionExpiresAt] = useState<
    number | null
  >(null);

  const providerOptions = useMemo(
    () =>
      Object.keys(PROVIDER_SUPPORTED_AUTH_MODES)
        .sort((a, b) =>
          formatProviderLabel(a).localeCompare(formatProviderLabel(b)),
        )
        .map((providerId) => ({
          providerId,
          label: formatProviderLabel(providerId),
        })),
    [],
  );
  const selectedProviderOption = useMemo(
    () =>
      providerOptions.find(
        (option) => option.providerId === selectedAssistantProviderId,
      ),
    [providerOptions, selectedAssistantProviderId],
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
  const supportedAuthModes = resolveProviderSupportedAuthModes(
    selectedAssistantProviderId,
  );
  const selectedProviderOauthMethods = providerOauthMethods;
  const resolvedProviderOauthMethodId = selectedProviderOauthMethods.some(
    (method) => method.id === selectedProviderOauthMethodId,
  )
    ? selectedProviderOauthMethodId
    : resolveDefaultProviderOauthMethodId(selectedProviderOauthMethods);
  const selectedProviderOauthButtonLabel = resolveProviderOauthButtonLabel({
    methods: selectedProviderOauthMethods,
    methodId: resolvedProviderOauthMethodId,
  });
  const canStartProviderOauth =
    selectedAssistantAuthMode === 'oauth-access-token' &&
    Boolean(resolvedProviderOauthMethodId);

  useEffect(() => {
    let cancelled = false;
    const fallbackMethods = resolveProviderOauthMethods(
      selectedAssistantProviderId,
    );
    setProviderOauthMethods(fallbackMethods);

    async function loadProviderOauthMethods() {
      try {
        const response = await fetch(
          `/v1/auth/providers/methods?providerId=${encodeURIComponent(
            selectedAssistantProviderId,
          )}`,
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
          selectedAssistantProviderId,
          payload.methods ?? [],
        );
        setProviderOauthMethods(normalized);
        setSelectedProviderOauthMethodId((current) =>
          normalized.some((method) => method.id === current)
            ? current
            : (resolveDefaultProviderOauthMethodId(normalized) ?? ''),
        );
      } catch {
        if (cancelled) return;
        setProviderOauthMethods(fallbackMethods);
        setSelectedProviderOauthMethodId((current) =>
          fallbackMethods.some((method) => method.id === current)
            ? current
            : (resolveDefaultProviderOauthMethodId(fallbackMethods) ?? ''),
        );
      }
    }

    void loadProviderOauthMethods();

    return () => {
      cancelled = true;
    };
  }, [selectedAssistantProviderId]);

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
        (item) => item.providerId === selectedAssistantProviderId,
      );
      if (!match) {
        setProviderCredentialSavedAt(null);
        return false;
      }
      if (typeof match.updatedAt === 'number') {
        setProviderCredentialSavedAt(match.updatedAt * 1000);
      } else {
        setProviderCredentialSavedAt(Date.now());
      }
      if (match.authMode) {
        setSelectedAssistantAuthMode(match.authMode);
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsRefreshingProviderCredential(false);
    }
  }

  async function startProviderOauth() {
    if (!resolvedProviderOauthMethodId) return;
    const providerLabel = formatProviderLabel(selectedAssistantProviderId);
    const trimmedProject = providerProject.trim();
    const wait = (milliseconds: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, milliseconds);
      });

    setIsStartingProviderOauth(true);
    try {
      const response = await fetch('/v1/auth/providers/oauth/authorize', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          providerId: selectedAssistantProviderId,
          methodId: resolvedProviderOauthMethodId,
          model: selectedAssistantModelId,
          projectId:
            selectedAssistantProviderId === 'google' && trimmedProject
              ? trimmedProject
              : undefined,
        }),
      });
      if (!response.ok) {
        toast.error(await readErrorMessage(response));
        return;
      }
      const parsed = (await response.json()) as {
        authorizationUrl?: string;
        method?: string;
        verificationCode?: string;
        pollingIntervalSeconds?: number;
      };
      if (!parsed.authorizationUrl) {
        toast.error('OAuth authorization URL was not returned.');
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

      const popup = window.open(
        parsed.authorizationUrl,
        `${selectedAssistantProviderId}-oauth`,
        'popup=yes,width=560,height=760',
      );
      if (!popup) {
        window.location.assign(parsed.authorizationUrl);
        return;
      }

      toast.success('Complete the OAuth login in the popup window.');

      if (isDevicePollingOauth) {
        if (parsed.verificationCode) {
          toast.message(
            `Verification code: ${parsed.verificationCode}. Enter it in the popup to continue.`,
          );
        }
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
            await wait(nextWaitSeconds * 1000);
            continue;
          }

          if (!callbackResponse.ok) {
            toast.error(await readErrorMessage(callbackResponse));
            return;
          }

          const refreshed = await refreshStoredProviderCredential();
          if (refreshed) {
            toast.success(`${providerLabel} OAuth credential connected.`);
          } else {
            toast.message(
              'OAuth completed. Refresh credential status if it is not visible yet.',
            );
          }
          return;
        }

        toast.error('Timed out waiting for device authorization to complete.');
        return;
      }

      const poll = window.setInterval(async () => {
        if (!popup.closed) return;
        window.clearInterval(poll);
        const refreshed = await refreshStoredProviderCredential();
        if (refreshed) {
          toast.success(`${providerLabel} OAuth credential connected.`);
        }
      }, 1000);
    } catch {
      toast.error(`Failed to start ${providerLabel} OAuth.`);
    } finally {
      setIsStartingProviderOauth(false);
    }
  }

  async function createAuthSession() {
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
    const nextProviderId = nextProviderIdValue;
    const nextModelOptions = BUSINESS_ONBOARDING_MODEL_OPTIONS.filter(
      (option) => option.provider === nextProviderId,
    );

    setIsProviderComboboxOpen(false);
    setIsModelComboboxOpen(false);
    setSelectedAssistantProviderId(nextProviderId);
    setSelectedAssistantAuthMode(
      resolveProviderDefaultAuthMode(nextProviderId),
    );
    const fallbackOauthMethods = resolveProviderOauthMethods(nextProviderId);
    setProviderOauthMethods(fallbackOauthMethods);
    setSelectedProviderOauthMethodId(
      resolveDefaultProviderOauthMethodId(fallbackOauthMethods) ?? '',
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
    <div className="rounded-lg border bg-background/60 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">AI Integration</p>
          <p className="text-xs text-muted-foreground">
            Configure provider authentication here. Plugin browsing and AI
            workflow setup happen in Step 3.
          </p>
        </div>
        <Badge variant="secondary">{selectedModelOption.label}</Badge>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <FormLabel className="text-xs text-muted-foreground">
            AI provider
          </FormLabel>
          <Popover
            open={isProviderComboboxOpen}
            onOpenChange={setIsProviderComboboxOpen}
            modal
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={isProviderComboboxOpen}
                className="w-full justify-between"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selectedProviderOption ? (
                    <ProviderLogo
                      providerId={selectedProviderOption.providerId}
                      label={selectedProviderOption.label}
                    />
                  ) : null}
                  <span className="truncate">
                    {selectedProviderOption?.label || 'Choose provider'}
                  </span>
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] p-0"
            >
              <Command>
                <CommandInput placeholder="Search providers..." />
                <CommandList>
                  <CommandEmpty>No providers found.</CommandEmpty>
                  <CommandGroup>
                    {providerOptions.map((option) => (
                      <CommandItem
                        key={option.providerId}
                        value={`${option.label} ${option.providerId}`}
                        onSelect={() => {
                          handleProviderChange(option.providerId);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedAssistantProviderId === option.providerId
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        <ProviderLogo
                          providerId={option.providerId}
                          label={option.label}
                        />
                        <span className="ml-2 truncate">{option.label}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {option.providerId}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <FormLabel className="text-xs text-muted-foreground">AI model</FormLabel>
          {providerModelOptions.length > 0 ? (
            <Popover
              open={isModelComboboxOpen}
              onOpenChange={setIsModelComboboxOpen}
              modal
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isModelComboboxOpen}
                  className="w-full justify-between"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ProviderLogo
                      providerId={selectedAssistantProviderId}
                      label={formatProviderLabel(selectedAssistantProviderId)}
                    />
                    <span className="truncate">
                      {selectedModelOption.label || 'Choose model'}
                    </span>
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-0"
              >
                <Command>
                  <CommandInput placeholder="Search models..." />
                  <CommandList>
                    <CommandEmpty>No models found.</CommandEmpty>
                    <CommandGroup>
                      {providerModelOptions.map((option) => (
                        <CommandItem
                          key={option.id}
                          value={`${option.label} ${option.id} ${option.description ?? ''}`}
                          onSelect={() => {
                            setSelectedAssistantModelId(option.id);
                            setAuthSessionToken('');
                            setAuthSessionExpiresAt(null);
                            setIsModelComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedAssistantModelId === option.id
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <ProviderLogo
                            providerId={selectedAssistantProviderId}
                            label={formatProviderLabel(
                              selectedAssistantProviderId,
                            )}
                          />
                          <div className="ml-2 min-w-0">
                            <div className="truncate text-sm">{option.label}</div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              {option.id}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <Input
              placeholder="Model id (e.g., gpt-4o-mini)"
              value={selectedAssistantModelId}
              onChange={(event) => setSelectedAssistantModelId(event.target.value)}
            />
          )}
        </div>

        <div className="space-y-1">
          <FormLabel className="text-xs text-muted-foreground">Auth mode</FormLabel>
          <Select
            value={selectedAssistantAuthMode}
            onValueChange={(value) => {
              setSelectedAssistantAuthMode(value as AssistantAuthMode);
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

        {selectedAssistantAuthMode === 'oauth-access-token' &&
          selectedProviderOauthMethods.length > 0 && (
            <div className="space-y-1">
              <FormLabel className="text-xs text-muted-foreground">
                OAuth method
              </FormLabel>
              <Select
                value={resolvedProviderOauthMethodId ?? ''}
                onValueChange={(value) => {
                  setSelectedProviderOauthMethodId(value);
                  setProviderCredentialSavedAt(null);
                  setAuthSessionToken('');
                  setAuthSessionExpiresAt(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose OAuth method" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProviderOauthMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        {selectedAssistantAuthMode === 'api-key' && (
          <div className="space-y-1">
            <FormLabel className="text-xs text-muted-foreground">API key</FormLabel>
            <Input
              type="password"
              placeholder="sk-..."
              value={providerApiKey}
              onChange={(event) => setProviderApiKey(event.target.value)}
            />
          </div>
        )}

        {selectedAssistantAuthMode === 'oauth-access-token' && (
          <div className="space-y-1">
            <FormLabel className="text-xs text-muted-foreground">
              OAuth access token
            </FormLabel>
            <Input
              type="password"
              placeholder="Bearer token"
              value={providerOauthAccessToken}
              onChange={(event) => setProviderOauthAccessToken(event.target.value)}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowAdvancedSettings((current) => !current)}
        >
          {showAdvancedSettings ? 'Hide advanced settings' : 'Show advanced settings'}
        </Button>
        {showAdvancedSettings && (
          <div className="space-y-3 rounded-md border bg-muted/20 p-3">
            <div className="space-y-1">
              <FormLabel className="text-xs text-muted-foreground">
                Base URL (optional override)
              </FormLabel>
              <Input
                placeholder="https://api.openai.com/v1"
                value={providerBaseUrl}
                onChange={(event) => setProviderBaseUrl(event.target.value)}
              />
            </div>

            {selectedAssistantProviderId === 'bedrock' && (
              <div className="space-y-1">
                <FormLabel className="text-xs text-muted-foreground">
                  AWS region
                </FormLabel>
                <Input
                  placeholder="us-east-1"
                  value={providerRegion}
                  onChange={(event) => setProviderRegion(event.target.value)}
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
                    onChange={(event) => setProviderOrganization(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs text-muted-foreground">
                    Project (optional)
                  </FormLabel>
                  <Input
                    placeholder="proj_..."
                    value={providerProject}
                    onChange={(event) => setProviderProject(event.target.value)}
                  />
                </div>
              </>
            )}

            {selectedAssistantProviderId === 'google' && (
              <div className="space-y-1">
                <FormLabel className="text-xs text-muted-foreground">
                  Google project (optional)
                </FormLabel>
                <Input
                  placeholder="my-google-project-id"
                  value={providerProject}
                  onChange={(event) => setProviderProject(event.target.value)}
                />
              </div>
            )}
          </div>
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
          {isSavingProviderCredential ? 'Saving...' : 'Save credential'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refreshStoredProviderCredential}
          disabled={isRefreshingProviderCredential}
        >
          {isRefreshingProviderCredential
            ? 'Refreshing...'
            : 'Refresh credential status'}
        </Button>
        {canStartProviderOauth && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startProviderOauth}
            disabled={isStartingProviderOauth}
          >
            {isStartingProviderOauth
              ? 'Opening OAuth...'
              : selectedProviderOauthButtonLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={createAuthSession}
          disabled={isCreatingAuthSession}
        >
          {isCreatingAuthSession ? 'Creating session...' : 'Create auth session'}
        </Button>
        {authSessionToken && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={revokeAuthSession}
            disabled={isRevokingAuthSession}
          >
            {isRevokingAuthSession ? 'Revoking...' : 'Revoke auth session'}
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
            ? ` (expires at ${new Date(authSessionExpiresAt * 1000).toLocaleTimeString()})`
            : ''}
        </p>
      )}
    </div>
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
                    No plugins selected. You can continue without plugins.
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
                                field.onChange([...selectedReleaseIds, releaseId]);
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
