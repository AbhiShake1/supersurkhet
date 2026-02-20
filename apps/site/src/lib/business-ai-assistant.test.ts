import { describe, expect, it } from 'vitest';
import {
  buildAssistantFallbackResponse,
  deriveTodoProgress,
  mergeSelectedReleaseIds,
} from './business-ai-assistant';

describe('business-ai-assistant helpers', () => {
  it('merges release ids idempotently', () => {
    expect(
      mergeSelectedReleaseIds(
        ['plugin.alpha@1.0.0', 'plugin.beta@1.0.0'],
        ['plugin.beta@1.0.0', 'plugin.gamma@1.0.0'],
      ),
    ).toEqual([
      'plugin.alpha@1.0.0',
      'plugin.beta@1.0.0',
      'plugin.gamma@1.0.0',
    ]);
  });

  it('derives todo progress from completed items', () => {
    expect(
      deriveTodoProgress([
        { id: '1', title: 'A', done: true },
        { id: '2', title: 'B', done: false },
        { id: '3', title: 'C', done: true },
      ]),
    ).toBe(67);
  });

  it('builds multistep fallback response with quick options', () => {
    const response = buildAssistantFallbackResponse({
      businessType: 'ride_sharing',
      selectedReleaseIds: [],
      availableReleaseIds: [
        'supersurkhet.plugin.customer-loyalty@1.0.0',
        'supersurkhet.plugin.catalog-intelligence@1.0.0',
      ],
      prompt: 'I want stronger loyalty and retention outcomes',
    });

    expect(response.quickOptions.options).toHaveLength(3);
    expect(response.quickOptions.otherOptionLabel).toContain('Something else');
    expect(response.suggestedReleaseIds).toContain(
      'supersurkhet.plugin.customer-loyalty@1.0.0',
    );
  });
});
