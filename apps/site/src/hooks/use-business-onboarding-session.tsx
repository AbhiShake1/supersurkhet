import { useCallback, useEffect, useMemo, useRef, useState, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import {
  businessOnboardingSessionReducer,
  createInitialBusinessOnboardingSession,
  type BusinessOnboardingStage,
} from '@/components/business-onboarding-chat-state';
import {
  BUSINESS_ONBOARDING_MODEL_OPTIONS,
  DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  PROVIDER_SUPPORTED_AUTH_MODES,
  resolveProviderDefaultAuthMode,
  resolveProviderSupportedAuthModes,
} from '@/lib/ai/business-onboarding-models';
import { getBusinessCreationAssistantTurn } from '@/server-functions/ai';
import { executeBoyaiPrompt, testBoyaiConnection } from '@/server-functions/ai-proxy';
import type { AssistantAuthMode } from '@/lib/ai/business-onboarding-models';
import { gun } from '@/lib/gun';
import type {
  OptionProviderItem,
  OptionModelItem,
  OptionAuthModeItem,
  OptionOauthMethodItem,
} from '@/components/business-onboarding-option-composer';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  id: string;
}

interface QuickOption {
  questionId: string;
  prompt: string;
}

interface ManualCredentialState {
  apiKey: string;
  accessToken: string;
  baseUrl: string;
  region: string;
  organization: string;
  project: string;
}

interface ValidationStatus {
  isValidating: boolean;
  isValid: boolean;
  error: string | null;
}

const QUICK_OPTION_PROMPTS: QuickOption[] = [
  {
    questionId: 'q1',
    prompt: 'I run a restaurant and need to manage orders, reservations, and staff.',
  },
  {
    questionId: 'q2',
    prompt: 'I operate a retail store and need inventory, POS, and sales tracking.',
  },
  {
    questionId: 'q3',
    prompt: 'I run a service business and need scheduling, invoicing, and client management.',
  },
];

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatProviderLabel(providerId: string): string {
  const parts = providerId.split('-').filter(Boolean);
  return parts
    .map((chunk) => `${chunk[0]?.toUpperCase() ?? ''}${chunk.slice(1)}`)
    .join(' ');
}

export function useBusinessOnboardingSession() {
  const defaultModelOption = BUSINESS_ONBOARDING_MODEL_OPTIONS.find(
    (o) => o.id === DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  ) ?? BUSINESS_ONBOARDING_MODEL_OPTIONS[0];

  const [session, dispatch] = useState(() =>
    createInitialBusinessOnboardingSession({
      selectedProviderId: defaultModelOption.provider,
      selectedModelId: defaultModelOption.id,
      selectedAuthMode: defaultModelOption.defaultAuthMode,
    }),
  );

  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [oauthMethods, setOauthMethods] = useState<OptionOauthMethodItem[]>([]);
  const [isStartingOauth, setIsStartingOauth] = useState(false);
  const [isSavingManualCredential, setIsSavingManualCredential] = useState(false);
  const [isRefreshingCredential, setIsRefreshingCredential] = useState(false);
  const [suggestedReleaseIds, setSuggestedReleaseIds] = useState<string[]>([]);
  const [modelsDevModels, setModelsDevModels] = useState<Record<string, Array<{ id: string; name: string; family?: string }>>>({});

  const [manualCredentialState, setManualCredentialState] = useState<ManualCredentialState>({
    apiKey: '',
    accessToken: '',
    baseUrl: '',
    region: '',
    organization: '',
    project: '',
  });

  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    isValidating: false,
    isValid: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  function ensureAborted() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }

  // Load models.dev catalog on mount — provides full model list per provider
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('https://models.dev/api.json');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data && typeof data === 'object') {
          const parsed: Record<string, Array<{ id: string; name: string; family?: string }>> = {};
          for (const [providerId, providerData] of Object.entries(data) as Array<[string, { models?: Record<string, { id?: string; name?: string; family?: string }> }]> ) {
            if (providerData.models) {
              parsed[providerId] = Object.values(providerData.models)
                .filter((m): m is { id: string; name: string; family?: string } =>
                  typeof m.id === 'string' && m.id.trim().length > 0,
                )
                .map((m) => ({ id: m.id, name: m.name || m.id, family: m.family }));
            }
          }
          setModelsDevModels(parsed);
        }
      } catch {
        // Silent — fall back to static model list
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch OAuth methods when provider changes
  useEffect(() => {
    if (!session.selectedProviderId) return;
    let cancelled = false;
    ensureAborted();
    async function load() {
      try {
        const res = await fetch(
          `/v1/auth/providers/methods?providerId=${encodeURIComponent(session.selectedProviderId)}`,
          { credentials: 'include' },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          const normalized: OptionOauthMethodItem[] = data
            .filter((m: { id?: string; type?: string }) => m.type === 'oauth' && m.id)
            .map((m: { id: string; label: string }) => ({
              id: m.id,
              label: m.label || m.id,
            }));
          setOauthMethods(normalized);
        }
      } catch {
        // OAuth methods are optional — fall back to seed data
      }
    }
    load();
    return () => { cancelled = true; };
  }, [session.selectedProviderId]);

  // Provider name map — human-readable labels, not model names
  const providerNameMap: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Gemini',
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

  // Derived: provider options
  const providerOptions = useMemo<OptionProviderItem[]>(() => {
    const results: OptionProviderItem[] = [];
    for (const [providerId, supportedAuthModes] of Object.entries(PROVIDER_SUPPORTED_AUTH_MODES)) {
      results.push({
        providerId,
        label: providerNameMap[providerId] ?? formatProviderLabel(providerId),
        supportedAuthModes: supportedAuthModes as readonly AssistantAuthMode[],
      });
    }
    return results.sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Derived: model options for selected provider — combine static + dynamic catalog
  const modelOptions = useMemo<OptionModelItem[]>(() => {
    if (!session.selectedProviderId) return [];
    const staticModels = BUSINESS_ONBOARDING_MODEL_OPTIONS
      .filter((o) => o.provider === session.selectedProviderId)
      .map((o) => ({
        id: o.id,
        label: o.label,
        providerId: o.provider,
        group: o.id === DEFAULT_BUSINESS_ONBOARDING_MODEL_ID ? 'default' as const : 'preferred' as const,
        description: o.description,
      }));

    // Add dynamic models from models.dev catalog
    const devModels = modelsDevModels[session.selectedProviderId] ?? [];
    const staticIds = new Set(staticModels.map((m) => m.id));
    const additionalModels = devModels
      .filter((m) => !staticIds.has(m.id))
      .map((m) => ({
        id: m.id,
        label: m.name || m.id,
        providerId: session.selectedProviderId,
        group: 'preferred' as const,
        description: m.family,
      }));

    return [...staticModels, ...additionalModels];
  }, [session.selectedProviderId, modelsDevModels]);

  // Derived: auth mode options
  const authModeOptions = useMemo<OptionAuthModeItem[]>(() => {
    if (!session.selectedProviderId) return [];
    const modes = resolveProviderSupportedAuthModes(session.selectedProviderId);
    return modes.map((mode) => ({
      id: mode,
      label:
        mode === 'api-key'
          ? 'API key'
          : mode === 'oauth-access-token'
            ? 'OAuth access token'
            : mode === 'aws-credential-chain'
              ? 'AWS credential chain'
              : 'No auth',
    }));
  }, [session.selectedProviderId]);

  // Derived: labels
  const selectedProviderLabel = useMemo(() => {
    if (!session.selectedProviderId) return '';
    const opt = providerOptions.find((o) => o.providerId === session.selectedProviderId);
    return opt?.label ?? formatProviderLabel(session.selectedProviderId);
  }, [session.selectedProviderId, providerOptions]);

  const selectedModelLabel = useMemo(() => {
    if (!session.selectedModelId) return '';
    const opt = modelOptions.find((o) => o.id === session.selectedModelId);
    return opt?.label ?? session.selectedModelId;
  }, [session.selectedModelId, modelOptions]);

  const selectedAuthModeLabel = useMemo(() => {
    const opt = authModeOptions.find((o) => o.id === session.selectedAuthMode);
    return opt?.label ?? session.selectedAuthMode;
  }, [session.selectedAuthMode, authModeOptions]);

  const oauthState = useMemo(() => session.oauthState, [session.oauthState]);
  const oauthAuthorizationUrl = useMemo(
    () => session.oauthAuthorizationUrl,
    [session.oauthAuthorizationUrl],
  );

  const canStartOauth = useMemo(() => {
    return (
      session.selectedAuthMode === 'oauth-access-token' &&
      !!session.selectedProviderId &&
      !!session.oauthMethodId
    );
  }, [session.selectedAuthMode, session.selectedProviderId, session.oauthMethodId]);

  const hasProviderCredential = useMemo(() => {
    return validationStatus.isValid || session.authStatus === 'connected';
  }, [validationStatus.isValid, session.authStatus]);

  const hasAuthError = useMemo(() => {
    return !!session.authError || !!validationStatus.error;
  }, [session.authError, validationStatus.error]);

  // --- Handlers ---

  const onSelectProvider = useCallback((providerId: string) => {
    ensureAborted();
    const defaultAuthMode = resolveProviderDefaultAuthMode(providerId);
    const defaultModel =
      BUSINESS_ONBOARDING_MODEL_OPTIONS.find((o) => o.provider === providerId)?.id ?? '';
    dispatch((prev) =>
      businessOnboardingSessionReducer(prev, {
        type: 'select_provider',
        providerId,
        defaultAuthMode,
        modelId: defaultModel || undefined,
      }),
    );
    setValidationStatus({ isValidating: false, isValid: false, error: null });
    setOauthMethods([]);
    setManualCredentialState({ apiKey: '', accessToken: '', baseUrl: '', region: '', organization: '', project: '' });
    setStatusLines((prev) => [...prev, `Provider selected: ${providerId}`]);
  }, []);

  const onSelectModel = useCallback((modelId: string) => {
    dispatch((prev) =>
      businessOnboardingSessionReducer(prev, { type: 'select_model', modelId }),
    );
    setStatusLines((prev) => [...prev, `Model selected: ${modelId}`]);
  }, []);

  const onSelectAuthMode = useCallback((authMode: AssistantAuthMode) => {
    dispatch((prev) =>
      businessOnboardingSessionReducer(prev, { type: 'select_auth_mode', authMode }),
    );
    setStatusLines((prev) => [...prev, `Auth mode selected: ${authMode}`]);
  }, []);

  const onSelectOauthMethod = useCallback((oauthMethodId: string) => {
    dispatch((prev) =>
      businessOnboardingSessionReducer(prev, { type: 'select_oauth_method', oauthMethodId }),
    );
  }, []);

  // Read error from response
  const readErrorMessage = useCallback(async (response: Response) => {
    try {
      const parsed = (await response.json()) as { error?: { message?: string } };
      return parsed.error?.message || `Request failed (${response.status})`;
    } catch {
      return `Request failed (${response.status})`;
    }
  }, []);

  // Start OAuth flow
  const onStartOauth = useCallback(async () => {
    if (!canStartOauth) return;
    setIsStartingOauth(true);
    try {
      const res = await fetch('/v1/auth/providers/oauth/authorize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          providerId: session.selectedProviderId,
          methodId: session.oauthMethodId,
          model: session.selectedModelId || DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
        }),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        dispatch((prev) =>
          businessOnboardingSessionReducer(prev, { type: 'oauth_failed', message: msg }),
        );
        return;
      }
      const data = await res.json();
      const authorizationUrl = data.authorizationUrl as string | undefined;
      const verificationCode = data.verificationCode as string | undefined;

      if (!authorizationUrl) {
        dispatch((prev) =>
          businessOnboardingSessionReducer(prev, { type: 'oauth_failed', message: 'No authorization URL returned.' }),
        );
        return;
      }

      dispatch((prev) =>
        businessOnboardingSessionReducer(prev, {
          type: 'oauth_started',
          authorizationUrl,
          verificationCode,
        }),
      );

      const popup = window.open(authorizationUrl, `${session.selectedProviderId}-oauth`, 'popup=yes,width=560,height=760');
      if (!popup) {
        setStatusLines((prev) => [...prev, 'Popup blocked — use the manual OAuth link in the sidebar.']);
        return;
      }

      // Poll popup close
      const poll = window.setInterval(async () => {
        if (!popup.closed) return;
        window.clearInterval(poll);
        // After popup closes, try to refresh credential
        try {
          const refreshed = await fetch('/v1/auth/providers', { method: 'GET', credentials: 'include' });
          if (refreshed.ok) {
            const parsed = await refreshed.json();
            const rows = (parsed.data as Array<{ providerId?: string; updatedAt?: number }> | undefined) ?? [];
            const matches = rows.filter((item) => item.providerId === session.selectedProviderId);
            const match = [...matches].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
            if (match) {
              dispatch((prev) =>
                businessOnboardingSessionReducer(prev, { type: 'oauth_connected', at: Math.floor(Date.now() / 1000) }),
              );
              setStatusLines((prev) => [...prev, 'OAuth credential connected.']);
            }
          }
        } catch {
          // Silent
        }
      }, 1000);
      // Auto-stop after 5 minutes
      setTimeout(() => window.clearInterval(poll), 5 * 60 * 1000);
    } catch (err) {
      dispatch((prev) =>
        businessOnboardingSessionReducer(prev, {
          type: 'oauth_failed',
          message: err instanceof Error ? err.message : 'OAuth flow failed',
        }),
      );
    } finally {
      setIsStartingOauth(false);
    }
  }, [canStartOauth, session.selectedProviderId, session.selectedModelId, session.oauthMethodId, readErrorMessage]);

  // Save manual credential — POST /v1/auth/providers, then validate via /v1/chat/completions
  const onSaveManualCredential = useCallback(async () => {
    if (!session.selectedProviderId) return;
    setIsSavingManualCredential(true);
    setValidationStatus({ isValidating: true, isValid: false, error: null });
    try {
      const payload: Record<string, unknown> = {
        providerId: session.selectedProviderId,
        model: session.selectedModelId || DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
        authMode: session.selectedAuthMode,
      };
      if (session.selectedAuthMode === 'api-key' && manualCredentialState.apiKey) {
        payload.apiKey = manualCredentialState.apiKey;
      }
      if (session.selectedAuthMode === 'oauth-access-token' && manualCredentialState.accessToken) {
        payload.oauthAccessToken = manualCredentialState.accessToken;
      }
      if (manualCredentialState.baseUrl) payload.baseURL = manualCredentialState.baseUrl;
      if (manualCredentialState.region) payload.region = manualCredentialState.region;
      if (manualCredentialState.organization) payload.organization = manualCredentialState.organization;
      if (manualCredentialState.project) payload.project = manualCredentialState.project;

      // Step 1: Save credential to backend (stores in provider credential store cookie)
      const res = await fetch('/v1/auth/providers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        setValidationStatus({ isValidating: false, isValid: false, error: msg });
        return;
      }

      // Step 2: Create a session token from the stored credential
      const sessionRes = await fetch('/v1/auth/sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          providerId: session.selectedProviderId,
          model: session.selectedModelId || DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
          ttlSeconds: 3600,
        }),
      });
      if (!sessionRes.ok) {
        let msg = `HTTP ${sessionRes.status}`;
        try {
          const errData = await sessionRes.json();
          msg = (errData as { error?: { message?: string } })?.error?.message
            || JSON.stringify(errData);
        } catch {
          msg = await sessionRes.text().catch(() => `HTTP ${sessionRes.status}`);
        }
        setValidationStatus({ isValidating: false, isValid: false, error: msg });
        return;
      }
      const sessionData = await sessionRes.json();
      const sessionToken = sessionData.sessionToken as string | undefined;
      if (!sessionToken) {
        setValidationStatus({ isValidating: false, isValid: false, error: 'No session token returned.' });
        return;
      }

      // Step 3: Validate by calling /v1/chat/completions WITH the session token
      const chatRes = await fetch('/v1/chat/completions', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          model: session.selectedModelId || DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
          messages: [
            { role: 'user', content: 'Reply with "OK" in one word.' },
          ],
        }),
      });

      if (!chatRes.ok) {
        // Try to get detailed error, fallback to full response text
        let errMsg = `HTTP ${chatRes.status}`;
        try {
          const errData = await chatRes.json();
          errMsg = (errData as { error?: { message?: string } })?.error?.message
            || JSON.stringify(errData);
        } catch {
          errMsg = await chatRes.text().catch(() => `HTTP ${chatRes.status}`);
        }
        setValidationStatus({ isValidating: false, isValid: false, error: errMsg });
        return;
      }

      const chatData = await chatRes.json();
      const content = chatData?.choices?.[0]?.message?.content;
      if (content && typeof content === 'string') {
        setValidationStatus({ isValidating: false, isValid: true, error: null });
        dispatch((prev) =>
          businessOnboardingSessionReducer(prev, { type: 'oauth_connected', at: Math.floor(Date.now() / 1000) }),
        );
        setStatusLines((prev) => [...prev, `Credential validated. Model responded: "${content.trim()}"`]);
      } else {
        setValidationStatus({ isValidating: false, isValid: false, error: 'Model returned empty response.' });
      }
    } catch (err) {
      setValidationStatus({
        isValidating: false,
        isValid: false,
        error: err instanceof Error ? err.message : 'Failed to save credential',
      });
    } finally {
      setIsSavingManualCredential(false);
    }
  }, [session.selectedProviderId, session.selectedModelId, session.selectedAuthMode, manualCredentialState, readErrorMessage]);

  // Refresh credential status — GET /v1/auth/providers
  const onRefreshCredentialStatus = useCallback(async () => {
    setIsRefreshingCredential(true);
    try {
      const res = await fetch('/v1/auth/providers', { method: 'GET', credentials: 'include' });
      if (!res.ok) {
        setValidationStatus({ isValidating: false, isValid: false, error: 'Failed to refresh status.' });
        return;
      }
      const data = await res.json();
      const rows = (data.data as Array<{ providerId?: string; authMode?: string; updatedAt?: number }> | undefined) ?? [];
      const matches = rows.filter((item) => item.providerId === session.selectedProviderId);
      const match = [...matches].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
      if (match) {
        setValidationStatus({ isValidating: false, isValid: true, error: null });
        dispatch((prev) =>
          businessOnboardingSessionReducer(prev, { type: 'set_last_validated_at', at: Math.floor(Date.now() / 1000) }),
        );
        if (match.authMode) {
          dispatch((prev) =>
            businessOnboardingSessionReducer(prev, { type: 'select_auth_mode', authMode: match.authMode as AssistantAuthMode }),
          );
        }
      } else {
        setValidationStatus({ isValidating: false, isValid: false, error: 'No credential found for this provider.' });
      }
    } catch {
      setValidationStatus({ isValidating: false, isValid: false, error: 'Failed to refresh status.' });
    } finally {
      setIsRefreshingCredential(false);
    }
  }, [session.selectedProviderId]);

  const [isTestingModel, setIsTestingModel] = useState(false);

  // Test model — send a test prompt via /v1/chat/completions and return the response
  const testModel = useCallback(async (): Promise<string | null> => {
    if (!session.selectedProviderId || !session.selectedModelId) {
      setValidationStatus({ isValidating: false, isValid: false, error: 'Select a provider and model first.' });
      return null;
    }
    setIsTestingModel(true);
    setValidationStatus({ isValidating: true, isValid: false, error: null });
    try {
      // Test using the secure BYOK API proxy instead of legacy endpoints
      let testKey = manualCredentialState.apiKey;
      
      // If they are authenticating with oauth, the access token is used as the key
      if (session.selectedAuthMode === 'oauth-access-token' && manualCredentialState.accessToken) {
        testKey = manualCredentialState.accessToken;
      }

      if (!testKey) {
        setValidationStatus({ isValidating: false, isValid: false, error: 'Please enter your API Key first.' });
        return null;
      }
      
      // Pass the API key directly in the payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (testBoyaiConnection as any)({
        data: { apiKey: testKey }
      });

      if (result && result.success) {
        setValidationStatus({ isValidating: false, isValid: true, error: null });
        dispatch((prev) =>
          businessOnboardingSessionReducer(prev, { type: 'oauth_connected', at: Math.floor(Date.now() / 1000) }),
        );
        return result.text?.trim() || 'Connection successful';
      }

      setValidationStatus({ isValidating: false, isValid: false, error: 'Model returned empty response.' });
      return null;
    } catch (err) {
      setValidationStatus({
        isValidating: false,
        isValid: false,
        error: err instanceof Error ? err.message : 'Test failed — check your API key and model.',
      });
      return null;
    } finally {
      setIsTestingModel(false);
    }
  }, [session.selectedProviderId, session.selectedModelId, session.selectedAuthMode, manualCredentialState, readErrorMessage]);

  // Continue to business intent — validate via GET /v1/models, then transition
  const onContinueToIntent = useCallback(async () => {
    // Try to validate credential via /v1/models
    try {
      const res = await fetch('/v1/models', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          dispatch((prev) =>
            businessOnboardingSessionReducer(prev, { type: 'oauth_connected', at: Math.floor(Date.now() / 1000) }),
          );
        }
      }
    } catch {
      // Proceed anyway — user may not have a credential yet
    }
    dispatch((prev) =>
      businessOnboardingSessionReducer(prev, { type: 'set_stage', stage: 'business_intent' }),
    );
    setStatusLines((prev) => [...prev, 'Ready for business intent.']);
  }, []);

  // Submit business intent — call server function, append AI response
  const onSubmitBusinessIntent = useCallback(
    
    async (text: string) => {
      const userMsg: ChatMessage = { role: 'user', content: text, id: generateMessageId() };
      setThread((prev) => [...prev, userMsg]);

      const availableReleaseIds = BUSINESS_ONBOARDING_MODEL_OPTIONS.map((o) => o.id);

      try {
        let vaultKey: string | undefined;
        try {
          // @ts-expect-error - Gun internal type
          const userSeaPair = gun.user()._.sea;
          if (userSeaPair) {
            const encryptedKey = await new Promise<string>((resolve, reject) => {
              let isResolved = false;
              const timeout = setTimeout(() => {
                if (!isResolved) {
                  isResolved = true;
                  reject(new Error('timeout'));
                }
              }, 2000);
              gun.user().get('boyai_config').get('llm_api_key').once((data: any) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);
                if (data) resolve(data as string);
                else reject(new Error('not found'));
              });
            });
            const { default: SEA } = await import('gun/sea');
            vaultKey = await SEA.decrypt(encryptedKey, userSeaPair);
          }
        } catch {
          // Ignore vault errors, fallback to manual state
        }

        const apiKeyToUse = vaultKey || manualCredentialState.apiKey || undefined;

        const response = await getBusinessCreationAssistantTurn({
          data: {
            model: session.selectedModelId || DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
            providerApiKey: apiKeyToUse,
            provider: {
              providerId: session.selectedProviderId,
              model: session.selectedModelId || DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
              apiKey: apiKeyToUse,
              oauthAccessToken: manualCredentialState.accessToken || undefined,
              baseURL: manualCredentialState.baseUrl || undefined,
              region: manualCredentialState.region || undefined,
              organization: manualCredentialState.organization || undefined,
              project: manualCredentialState.project || undefined,
            },
            userPrompt: text,
            selectedReleaseIds: suggestedReleaseIds,
            availableReleaseIds,
            conversationHistory: thread.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            onboardingStage: session.stage,
            providerSelectionContext: {
              providerId: session.selectedProviderId,
              modelId: session.selectedModelId,
              authMode: session.selectedAuthMode,
            },
          },
          headers: vaultKey ? { 'X-Boyai-Key': vaultKey } : undefined,
        });

        if (response) {
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: response.assistantMessage,
            id: generateMessageId(),
          };
          setThread((prev) => [...prev, assistantMsg]);
          if (response.suggestedReleaseIds && response.suggestedReleaseIds.length > 0) {
            setSuggestedReleaseIds((prev) => [...new Set([...prev, ...response.suggestedReleaseIds])]);
          }
        }
      } catch {
        const fallbackMsg: ChatMessage = {
          role: 'assistant',
          content: "I can't connect to an AI model right now, but I can still help you set up your business. Could you tell me more about what kind of business you're running?",
          id: generateMessageId(),
        };
        setThread((prev) => [...prev, fallbackMsg]);
      }
    },
    [
      session.selectedProviderId, session.selectedModelId, session.selectedAuthMode, session.stage,
      manualCredentialState, suggestedReleaseIds, thread,
    ],
  );

  const onPickQuickOption = useCallback(
    (option: { questionId: string; prompt: string }) => {
      onSubmitBusinessIntent(option.prompt);
    },
    [onSubmitBusinessIntent],
  );

  const quickOptions = useMemo(() => QUICK_OPTION_PROMPTS.map((q) => q.prompt), []);
  const quickOptionData = useMemo(() => QUICK_OPTION_PROMPTS, []);

  // Credential change handlers
  const onApiKeyChange = useCallback((value: string) => {
    setManualCredentialState((prev) => ({ ...prev, apiKey: value }));
    setValidationStatus({ isValidating: false, isValid: false, error: null });
  }, []);

  const onBaseUrlChange = useCallback((value: string) => {
    setManualCredentialState((prev) => ({ ...prev, baseUrl: value }));
  }, []);

  const onAccessTokenChange = useCallback((value: string) => {
    setManualCredentialState((prev) => ({ ...prev, accessToken: value }));
    setValidationStatus({ isValidating: false, isValid: false, error: null });
  }, []);

  const onRegionChange = useCallback((value: string) => {
    setManualCredentialState((prev) => ({ ...prev, region: value }));
  }, []);

  const onOrganizationChange = useCallback((value: string) => {
    setManualCredentialState((prev) => ({ ...prev, organization: value }));
  }, []);

  const onProjectChange = useCallback((value: string) => {
    setManualCredentialState((prev) => ({ ...prev, project: value }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => { ensureAborted(); };
  }, []);

  return {
    stage: session.stage as BusinessOnboardingStage,
    thread,
    statusLines,
    selectedProviderLabel,
    selectedModelLabel,
    selectedAuthModeLabel,
    oauthState,
    authError: session.authError,
    oauthAuthorizationUrl,
    selectedProviderId: session.selectedProviderId,
    selectedModelId: session.selectedModelId,
    selectedAuthMode: session.selectedAuthMode,
    selectedOauthMethodId: session.oauthMethodId,
    isStartingOauth,
    canStartOauth,
    isSavingManualCredential,
    isRefreshingCredential,
    isTestingModel,
    testModel,
    hasProviderCredential,
    hasAuthError,

    onSelectProvider,
    onSelectModel,
    onSelectAuthMode,
    onSelectOauthMethod,
    onStartOauth,
    onSaveManualCredential,
    onRefreshCredentialStatus,
    onContinueToIntent,
    onSubmitBusinessIntent,
    onPickQuickOption,

    providerOptions,
    modelOptions,
    authModeOptions,
    oauthMethods,
    quickOptions,
    quickOptionData,

    suggestedReleaseIds,
    manualCredentialState,
    validationStatus,

    onApiKeyChange,
    onBaseUrlChange,
    onAccessTokenChange,
    onRegionChange,
    onOrganizationChange,
    onProjectChange,
  };
}

// ─── Shared context so Step 2 and Step 3 use the same session ───
type BusinessOnboardingSessionValue = ReturnType<typeof useBusinessOnboardingSession>;
const BusinessOnboardingSessionContext = createContext<BusinessOnboardingSessionValue | null>(null);

export function BusinessOnboardingSessionProvider({ children }: { children: ReactNode }) {
  const session = useBusinessOnboardingSession();
  return (
    <BusinessOnboardingSessionContext.Provider value={session}>
      {children}
    </BusinessOnboardingSessionContext.Provider>
  );
}

/**
 * Use this instead of `useBusinessOnboardingSession()` in components
 * rendered inside `<BusinessOnboardingSessionProvider>`.
 * Falls back to creating its own instance if no provider is found.
 */
export function useSharedBusinessOnboardingSession(): BusinessOnboardingSessionValue {
  const ctx = useContext(BusinessOnboardingSessionContext);
  if (ctx) return ctx;
  return useBusinessOnboardingSession();
}
