import type { AssistantAuthMode } from '@/lib/ai/business-onboarding-models';

export type BusinessOnboardingStage =
  | 'select_provider'
  | 'select_model'
  | 'select_auth_method'
  | 'authenticate'
  | 'auth_ready'
  | 'business_intent';

export type OauthFlowState = 'idle' | 'pending' | 'connected' | 'error';

export type BusinessOnboardingAuthStatus =
  | 'not-started'
  | 'connected'
  | 'failed'
  | 'skipped';

export interface BusinessOnboardingSessionState {
  stage: BusinessOnboardingStage;
  selectedProviderId: string;
  selectedModelId: string;
  selectedAuthMode: AssistantAuthMode;
  oauthMethodId: string;
  oauthState: OauthFlowState;
  authSessionToken: string;
  authStatus: BusinessOnboardingAuthStatus;
  authError: string;
  oauthAuthorizationUrl: string;
  oauthVerificationCode: string;
  lastValidatedAt: number | null;
}

export type BusinessOnboardingSessionAction =
  | { type: 'set_stage'; stage: BusinessOnboardingStage }
  | {
      type: 'select_provider';
      providerId: string;
      defaultAuthMode: AssistantAuthMode;
      modelId?: string;
      oauthMethodId?: string;
    }
  | { type: 'select_model'; modelId: string }
  | { type: 'select_auth_mode'; authMode: AssistantAuthMode }
  | { type: 'select_oauth_method'; oauthMethodId: string }
  | {
      type: 'oauth_started';
      authorizationUrl: string;
      verificationCode?: string;
    }
  | { type: 'oauth_connected'; at: number }
  | { type: 'oauth_failed'; message: string }
  | { type: 'set_auth_error'; message: string }
  | { type: 'set_auth_session_token'; token: string }
  | { type: 'set_last_validated_at'; at: number }
  | { type: 'clear_auth_session' }
  | { type: 'skip_auth' }
  | { type: 'reset_oauth_state' };

export function createInitialBusinessOnboardingSession(input: {
  selectedProviderId: string;
  selectedModelId: string;
  selectedAuthMode: AssistantAuthMode;
  oauthMethodId?: string;
}): BusinessOnboardingSessionState {
  return {
    stage: 'select_provider',
    selectedProviderId: input.selectedProviderId,
    selectedModelId: input.selectedModelId,
    selectedAuthMode: input.selectedAuthMode,
    oauthMethodId: input.oauthMethodId ?? '',
    oauthState: 'idle',
    authSessionToken: '',
    authStatus: 'not-started',
    authError: '',
    oauthAuthorizationUrl: '',
    oauthVerificationCode: '',
    lastValidatedAt: null,
  };
}

export function businessOnboardingSessionReducer(
  state: BusinessOnboardingSessionState,
  action: BusinessOnboardingSessionAction,
): BusinessOnboardingSessionState {
  if (action.type === 'set_stage') {
    return {
      ...state,
      stage: action.stage,
    };
  }

  if (action.type === 'select_provider') {
    return {
      ...state,
      selectedProviderId: action.providerId,
      selectedModelId: action.modelId ?? state.selectedModelId,
      selectedAuthMode: action.defaultAuthMode,
      oauthMethodId: action.oauthMethodId ?? '',
      stage: 'select_model',
      oauthState: 'idle',
      authStatus: 'not-started',
      authError: '',
      authSessionToken: '',
      oauthAuthorizationUrl: '',
      oauthVerificationCode: '',
      lastValidatedAt: null,
    };
  }

  if (action.type === 'select_model') {
    return {
      ...state,
      selectedModelId: action.modelId,
      stage: 'select_auth_method',
      authError: '',
      authSessionToken: '',
    };
  }

  if (action.type === 'select_auth_mode') {
    return {
      ...state,
      selectedAuthMode: action.authMode,
      stage: 'authenticate',
      oauthState: 'idle',
      authError: '',
      authStatus: 'not-started',
      authSessionToken: '',
      oauthAuthorizationUrl: '',
      oauthVerificationCode: '',
    };
  }

  if (action.type === 'select_oauth_method') {
    return {
      ...state,
      oauthMethodId: action.oauthMethodId,
      oauthState: 'idle',
      authError: '',
      oauthAuthorizationUrl: '',
      oauthVerificationCode: '',
    };
  }

  if (action.type === 'oauth_started') {
    return {
      ...state,
      oauthState: 'pending',
      authStatus: 'not-started',
      authError: '',
      oauthAuthorizationUrl: action.authorizationUrl,
      oauthVerificationCode: action.verificationCode ?? '',
    };
  }

  if (action.type === 'oauth_connected') {
    return {
      ...state,
      oauthState: 'connected',
      authStatus: 'connected',
      authError: '',
      stage: 'auth_ready',
      lastValidatedAt: action.at,
    };
  }

  if (action.type === 'oauth_failed') {
    return {
      ...state,
      oauthState: 'error',
      authStatus: 'failed',
      authError: action.message,
    };
  }

  if (action.type === 'set_auth_error') {
    return {
      ...state,
      authError: action.message,
      authStatus: action.message ? 'failed' : state.authStatus,
    };
  }

  if (action.type === 'set_auth_session_token') {
    return {
      ...state,
      authSessionToken: action.token,
    };
  }

  if (action.type === 'set_last_validated_at') {
    return {
      ...state,
      lastValidatedAt: action.at,
    };
  }

  if (action.type === 'clear_auth_session') {
    return {
      ...state,
      authSessionToken: '',
    };
  }

  if (action.type === 'reset_oauth_state') {
    return {
      ...state,
      oauthState: 'idle',
      authError: '',
      oauthAuthorizationUrl: '',
      oauthVerificationCode: '',
      authStatus: 'not-started',
    };
  }

  if (action.type === 'skip_auth') {
    return {
      ...state,
      authStatus: 'skipped',
      stage: 'business_intent',
      authError: '',
    };
  }

  return state;
}

export function canTransitionToBusinessIntent(
  state: Pick<BusinessOnboardingSessionState, 'authStatus'>,
): boolean {
  return state.authStatus === 'connected' || state.authStatus === 'skipped';
}
