import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ReviewDiagnosticsTab,
  getReviewDiagnosticsBlockingState,
} from './review-diagnostics-tab';

describe('review-diagnostics-tab', () => {
  it('renders grouped diagnostics, blocking badge, side-by-side artifact/hash preview, and changelog summary', () => {
    const html = renderToStaticMarkup(
      <ReviewDiagnosticsTab
        diagnostics={[
          {
            category: 'workflow-validation',
            code: 'cycle-detected',
            severity: 'error',
            message: 'Workflow contains a cycle',
            path: ['workflows', 'checkout', 'edges', '0'],
          },
          {
            category: 'workflow-validation',
            code: 'missing-edge-to',
            severity: 'error',
            message: 'Edge target is missing',
            path: ['workflows', 'checkout', 'edges', '0'],
          },
          {
            category: 'capability-validation',
            code: 'missing-capability',
            severity: 'warning',
            message: 'Action requires inventory:write capability',
            path: ['workflows', 'checkout', 'nodes', '1'],
          },
        ]}
        artifactDiff={{
          added: ['schemaDocs/offer'],
          changed: ['workflows/checkout'],
          removed: ['adminTabs/legacy'],
        }}
        hashPreview={{
          manifestHash: 'abc123',
          artifactHash: 'def456',
        }}
        changelog={[
          {
            label: 'Workflow',
            summary: 'Added inventory sync step before publish',
          },
        ]}
      />,
    );

    expect(html).toContain('Review Diagnostics');
    expect(html).toContain('Blocking');
    expect(html).toContain('2 errors');
    expect(html).toContain('1 warning');
    expect(html).toContain('workflows.checkout.edges.0');
    expect(html).toContain('Workflow contains a cycle');
    expect(html).toContain('Edge target is missing');
    expect(html).toContain('Artifact Diff');
    expect(html).toContain('Hash Preview');
    expect(html).toContain('schemaDocs/offer');
    expect(html).toContain('workflows/checkout');
    expect(html).toContain('adminTabs/legacy');
    expect(html).toContain('abc123');
    expect(html).toContain('def456');
    expect(html).toContain('Changelog Summary');
    expect(html).toContain('Added inventory sync step before publish');
  });

  it('renders ready and empty states when no diagnostics or changes exist', () => {
    const html = renderToStaticMarkup(
      <ReviewDiagnosticsTab
        diagnostics={[]}
        artifactDiff={{ added: [], changed: [], removed: [] }}
        hashPreview={{ manifestHash: 'manifest-ok', artifactHash: 'artifact-ok' }}
        changelog={[]}
      />,
    );

    expect(html).toContain('Ready');
    expect(html).toContain('No diagnostics to review');
    expect(html).toContain('No added artifacts');
    expect(html).toContain('No changed artifacts');
    expect(html).toContain('No removed artifacts');
    expect(html).toContain('No changelog entries yet');
  });

  it('marks publish as blocking when at least one error diagnostic exists', () => {
    const blocking = getReviewDiagnosticsBlockingState([
      {
        category: 'workflow-validation',
        code: 'edge-node-not-found',
        severity: 'error',
        message: 'Edge references an unknown node',
        path: ['workflows', 'checkout', 'edges', '2'],
      },
      {
        category: 'capability-validation',
        code: 'missing-capability',
        severity: 'warning',
        message: 'Capability missing',
        path: ['workflows', 'checkout', 'nodes', '2'],
      },
    ]);

    expect(blocking).toEqual({
      isBlocking: true,
      label: 'Blocking',
      blockingCount: 1,
    });
  });
});
