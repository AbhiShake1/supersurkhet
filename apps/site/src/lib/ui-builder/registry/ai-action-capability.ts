export type AiActionCapabilityIntent = 'read-only' | 'mutation';

export type AiActionSurface = 'global_assistant' | 'embedded_ai';

export interface AiActionCapabilityDoc {
  actionId: string;
  surface: AiActionSurface;
  intent: AiActionCapabilityIntent;
  description: string;
}

const UNKNOWN_AI_ACTION_CAPABILITY: AiActionCapabilityDoc = {
  actionId: 'unknown',
  surface: 'embedded_ai',
  intent: 'mutation',
  description: 'Unknown AI action. Defaults to mutation-safe policy.',
};

export const UI_AI_ACTION_CAPABILITIES: readonly AiActionCapabilityDoc[] = [
  {
    actionId: 'global-assistant.open',
    surface: 'global_assistant',
    intent: 'read-only',
    description: 'Open the global assistant in a read-only guidance mode.',
  },
  {
    actionId: 'global-assistant.propose-mutation',
    surface: 'global_assistant',
    intent: 'mutation',
    description: 'Apply a global assistant suggested mutation.',
  },
  {
    actionId: 'embedded-ai.explain-selection',
    surface: 'embedded_ai',
    intent: 'read-only',
    description: 'Explain a selected UI element and suggest improvements.',
  },
  {
    actionId: 'embedded-ai.apply-generated-layout',
    surface: 'embedded_ai',
    intent: 'mutation',
    description: 'Apply an AI-generated layout update to the current page.',
  },
  {
    actionId: 'embedded-ai.copy-system-prompt',
    surface: 'embedded_ai',
    intent: 'read-only',
    description: 'Generate and copy a prompt for external AI assistance.',
  },
];

export function resolveAiActionCapability(
  actionId: string,
): AiActionCapabilityDoc {
  const resolved = UI_AI_ACTION_CAPABILITIES.find(
    (item) => item.actionId === actionId,
  );
  if (resolved) return resolved;
  return {
    ...UNKNOWN_AI_ACTION_CAPABILITY,
    actionId,
  };
}

export function isMutatingAiAction(actionId: string): boolean {
  return resolveAiActionCapability(actionId).intent === 'mutation';
}
