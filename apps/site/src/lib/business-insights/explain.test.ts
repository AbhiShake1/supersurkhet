import { describe, expect, it } from 'vitest';
import { buildAssistantInsightExplanations } from './explain';

describe('buildAssistantInsightExplanations', () => {
  it('renders explainable insight output with source references', () => {
    const response = buildAssistantInsightExplanations([
      {
        id: 'inventory-alert',
        title: 'Low stock trend detected',
        suggestion: 'Raise reorder frequency for top-selling SKUs.',
        reasoning:
          'Recent sell-through speed is outpacing replenishment in the top category.',
        confidenceScore: 0.82,
        impactScore: 0.76,
        sources: [
          {
            type: 'table',
            id: 'inventory_events',
            label: 'Inventory Events',
          },
          {
            type: 'metric',
            id: 'sell_through_rate',
            label: 'Sell-through rate',
          },
          {
            type: 'schema-field',
            id: 'products.reorder_point',
            label: 'Reorder point',
          },
        ],
      },
    ]);

    expect(response).toHaveLength(1);
    expect(response[0].confidence.label).toBe('high');
    expect(response[0].impact.label).toBe('high');
    expect(response[0].sources).toEqual([
      {
        type: 'table',
        id: 'inventory_events',
        label: 'Inventory Events',
      },
      {
        type: 'metric',
        id: 'sell_through_rate',
        label: 'Sell-through rate',
      },
      {
        type: 'schema-field',
        id: 'products.reorder_point',
        label: 'Reorder point',
      },
    ]);
    expect(response[0].sanitized).toBe(false);
  });

  it('redacts sensitive fields in explanations and source references', () => {
    const response = buildAssistantInsightExplanations([
      {
        id: 'credential-risk',
        title: 'api_key leakage risk',
        suggestion:
          'Move password: hunter2 and token=abc123 into a secret store.',
        reasoning:
          'Found private_key: sk-live in schema mapping for connector credentials.',
        confidenceScore: 1.4,
        impactScore: -0.2,
        sources: [
          {
            type: 'schema-field',
            id: 'integrations.api_key',
            label: 'API Key',
          },
        ],
      },
    ]);

    expect(response[0].title).not.toMatch(/api_key/i);
    expect(response[0].suggestion).not.toMatch(/hunter2|abc123/i);
    expect(response[0].suggestion).toContain('[REDACTED]');
    expect(response[0].explanation).toContain('[REDACTED]');
    expect(response[0].sources[0].id).toContain('[REDACTED_FIELD]');
    expect(response[0].sources[0].label).toContain('[REDACTED_FIELD]');
    expect(response[0].confidence.score).toBe(1);
    expect(response[0].impact.score).toBe(0);
    expect(response[0].sanitized).toBe(true);
  });
});
