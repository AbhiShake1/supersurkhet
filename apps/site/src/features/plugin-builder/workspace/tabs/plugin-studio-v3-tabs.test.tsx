// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PluginStudioV3Tabs } from './plugin-studio-v3-tabs';

afterEach(() => {
  cleanup();
});

describe('PluginStudioV3Tabs', () => {
  it('keeps replay controls disabled when no actionable jobs are available', () => {
    render(
      <PluginStudioV3Tabs
        schemaDocs={[]}
        workflows={[]}
        actionManifest={[]}
        diagnostics={[]}
        jobCount={0}
        eventLogCount={0}
      />,
    );

    expect(
      screen.getByText(
        'Replay controls target the latest eligible workflow job in this plugin.',
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Retry Job' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Resume From Node' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Cancel Workflow' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('enables replay controls when handlers and actionability flags are provided', () => {
    render(
      <PluginStudioV3Tabs
        schemaDocs={[]}
        workflows={[]}
        actionManifest={[]}
        diagnostics={[]}
        jobCount={3}
        eventLogCount={9}
        canRetryJob
        canResumeFromNode
        canCancelWorkflow
        onRetryJob={() => {}}
        onResumeFromNode={() => {}}
        onCancelWorkflow={() => {}}
      />,
    );

    expect(
      screen
        .getByRole('button', { name: 'Retry Job' })
        .hasAttribute('disabled'),
    ).toBe(false);
    expect(
      screen
        .getByRole('button', { name: 'Resume From Node' })
        .hasAttribute('disabled'),
    ).toBe(false);
    expect(
      screen
        .getByRole('button', { name: 'Cancel Workflow' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });
});
