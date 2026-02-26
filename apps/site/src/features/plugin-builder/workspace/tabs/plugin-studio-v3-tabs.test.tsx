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
        'Replay controls are scaffolded for V3 and will run against durable job/attempt entities.',
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

  it('shows execution counters when jobs and events exist', () => {
    render(
      <PluginStudioV3Tabs
        schemaDocs={[]}
        workflows={[]}
        actionManifest={[]}
        diagnostics={[]}
        jobCount={3}
        eventLogCount={9}
      />,
    );

    expect(screen.getByText('3 jobs')).toBeTruthy();
    expect(screen.getByText('9 log events')).toBeTruthy();
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
});
