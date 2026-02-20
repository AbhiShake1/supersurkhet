export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
}

export interface AssistantQuickOptionSet {
  questionId: string;
  prompt: string;
  options: [string, string, string];
  otherOptionLabel: string;
}

export interface AssistantScaffoldProposal {
  title: string;
  reason: string;
}

export interface AssistantTurnResponse {
  assistantMessage: string;
  quickOptions: AssistantQuickOptionSet;
  suggestedReleaseIds: string[];
  scaffoldProposal: AssistantScaffoldProposal | null;
  todoItems: TodoItem[];
}

export interface BuildAssistantFallbackParams {
  selectedReleaseIds: string[];
  availableReleaseIds: string[];
  prompt: string;
}

export function mergeSelectedReleaseIds(
  current: string[],
  incoming: string[],
): string[] {
  const merged = new Set(current);
  for (const releaseId of incoming) {
    merged.add(releaseId);
  }
  return Array.from(merged);
}

export function deriveTodoProgress(items: TodoItem[]): number {
  if (items.length === 0) return 0;
  const doneCount = items.filter((item) => item.done).length;
  return Math.round((doneCount / items.length) * 100);
}

export function buildAssistantFallbackResponse({
  selectedReleaseIds,
  availableReleaseIds,
  prompt,
}: BuildAssistantFallbackParams): AssistantTurnResponse {
  const normalizedPrompt = prompt.toLowerCase();

  const selectedByIntent = availableReleaseIds.filter((releaseId) => {
    if (
      normalizedPrompt.includes('loyalty') ||
      normalizedPrompt.includes('retention')
    ) {
      return releaseId.includes('customer-loyalty');
    }
    if (
      normalizedPrompt.includes('inventory') ||
      normalizedPrompt.includes('catalog')
    ) {
      return releaseId.includes('catalog-intelligence');
    }
    if (
      normalizedPrompt.includes('fulfillment') ||
      normalizedPrompt.includes('delivery')
    ) {
      return releaseId.includes('fulfillment-ops');
    }
    return false;
  });

  const suggestedReleaseIds =
    selectedByIntent.length > 0
      ? selectedByIntent
      : availableReleaseIds.slice(0, Math.min(2, availableReleaseIds.length));

  const todoItems: TodoItem[] = [
    {
      id: 'intent',
      title: 'Capture business intent from conversation',
      done: prompt.trim().length > 0,
    },
    {
      id: 'suggestions',
      title: 'Generate plugin suggestions from marketplace',
      done: suggestedReleaseIds.length > 0,
    },
    {
      id: 'selection',
      title: 'Confirm at least one plugin in install queue',
      done: selectedReleaseIds.length > 0,
    },
  ];

  return {
    assistantMessage:
      suggestedReleaseIds.length > 0
        ? 'I found plugin suggestions for your goals. You can apply them directly and refine further.'
        : `I could not find an exact plugin match yet. I can propose a scaffold next if you want to continue.`,
    quickOptions: {
      questionId: 'business-goal-next-step',
      prompt: 'Which direction should we optimize next?',
      options: [
        'Lower costs',
        'Faster operations',
        'Higher customer retention',
      ],
      otherOptionLabel: 'Something else (type your own)',
    },
    suggestedReleaseIds,
    scaffoldProposal:
      suggestedReleaseIds.length === 0
        ? {
            title: 'Custom plugin scaffold',
            reason: 'No exact marketplace plugin matched your current request.',
          }
        : null,
    todoItems,
  };
}
