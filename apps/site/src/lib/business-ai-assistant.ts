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
  const hasBusinessSignal =
    normalizedPrompt.includes('restaurant') ||
    normalizedPrompt.includes('shop') ||
    normalizedPrompt.includes('store') ||
    normalizedPrompt.includes('salon') ||
    normalizedPrompt.includes('gym') ||
    normalizedPrompt.includes('clinic') ||
    normalizedPrompt.includes('service') ||
    prompt.trim().length > 16;
  const hasOperationSignal =
    normalizedPrompt.includes('sell') ||
    normalizedPrompt.includes('offer') ||
    normalizedPrompt.includes('book') ||
    normalizedPrompt.includes('delivery') ||
    normalizedPrompt.includes('inventory') ||
    normalizedPrompt.includes('billing') ||
    normalizedPrompt.includes('manage') ||
    prompt.trim().length > 32;

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
      id: 'business-kind',
      title: 'Understand what business you are creating',
      done: hasBusinessSignal,
    },
    {
      id: 'business-operations',
      title: 'Capture what the business does day-to-day',
      done: hasOperationSignal,
    },
    {
      id: 'setup-plan',
      title: 'Draft an optional setup plan for launch',
      done:
        hasOperationSignal &&
        (selectedReleaseIds.length > 0 ||
          suggestedReleaseIds.length > 0 ||
          availableReleaseIds.length === 0),
    },
  ];

  let assistantMessage =
    'What kind of business are you creating? Tell me what it does day-to-day so I can draft the setup.';

  if (hasBusinessSignal && !hasOperationSignal) {
    assistantMessage =
      'Great start. What does your team do every day, and what should customers be able to do first?';
  } else if (hasOperationSignal && suggestedReleaseIds.length > 0) {
    assistantMessage =
      'Great, I drafted an optional setup plan based on that workflow. We can refine it before you create the business.';
  } else if (hasOperationSignal) {
    assistantMessage =
      'Understood. I can keep refining your launch setup in chat, even if no exact plugin match is available yet.';
  }

  return {
    assistantMessage,
    quickOptions: {
      questionId: 'business-onboarding-next-step',
      prompt: 'Choose a quick follow-up or type your own.',
      options: [
        'Describe my daily workflow',
        'List my top pain points',
        'Focus on customer experience',
      ],
      otherOptionLabel: 'Type custom follow-up',
    },
    suggestedReleaseIds,
    scaffoldProposal:
      suggestedReleaseIds.length === 0
        ? {
            title: 'Custom workflow scaffold',
            reason: 'No exact marketplace plugin matched this onboarding input.',
          }
        : null,
    todoItems,
  };
}
