export type AiPermissionPolicyChoice =
  | 'allow_once'
  | 'allow_always'
  | 'deny_session';

export interface AiPermissionPolicyDoc {
  choice: AiPermissionPolicyChoice;
  updatedAt: number;
}

export interface AiPermissionPolicyState {
  policy: AiPermissionPolicyDoc | null;
}

export type AiPermissionPolicyEvent =
  | {
      type: 'set_policy';
      choice: AiPermissionPolicyChoice;
      at: number;
    }
  | {
      type: 'consume_mutation_grant';
      at: number;
    }
  | {
      type: 'clear_policy';
    };

export const EMPTY_AI_PERMISSION_POLICY_STATE: AiPermissionPolicyState = {
  policy: null,
};

export function transitionAiPermissionPolicyState(
  state: AiPermissionPolicyState,
  event: AiPermissionPolicyEvent,
): AiPermissionPolicyState {
  if (event.type === 'set_policy') {
    return {
      policy: {
        choice: event.choice,
        updatedAt: event.at,
      },
    };
  }

  if (event.type === 'consume_mutation_grant') {
    if (!state.policy) {
      return state;
    }

    if (state.policy.choice !== 'allow_once') {
      return state;
    }

    return {
      policy: null,
    };
  }

  if (event.type === 'clear_policy') {
    return EMPTY_AI_PERMISSION_POLICY_STATE;
  }

  return state;
}

export interface AiPermissionPolicyStore {
  getState: () => AiPermissionPolicyState;
  getPolicy: () => AiPermissionPolicyDoc | null;
  setPolicy: (
    choice: AiPermissionPolicyChoice,
    at: number,
  ) => AiPermissionPolicyDoc;
  consumeMutationGrant: (at: number) => boolean;
  clearPolicy: () => void;
}

export function createAiPermissionPolicyStore(
  initialState: AiPermissionPolicyState = EMPTY_AI_PERMISSION_POLICY_STATE,
): AiPermissionPolicyStore {
  let state: AiPermissionPolicyState = initialState;

  return {
    getState: () => state,
    getPolicy: () => state.policy,
    setPolicy: (choice, at) => {
      state = transitionAiPermissionPolicyState(state, {
        type: 'set_policy',
        choice,
        at,
      });

      return state.policy as AiPermissionPolicyDoc;
    },
    consumeMutationGrant: (at) => {
      const previousState = state;
      state = transitionAiPermissionPolicyState(state, {
        type: 'consume_mutation_grant',
        at,
      });

      return (
        previousState.policy?.choice === 'allow_once' &&
        previousState.policy !== state.policy
      );
    },
    clearPolicy: () => {
      state = transitionAiPermissionPolicyState(state, {
        type: 'clear_policy',
      });
    },
  };
}
