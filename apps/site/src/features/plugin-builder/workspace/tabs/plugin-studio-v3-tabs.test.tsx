// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PluginStudioV3Tabs,
  type PluginStudioV3TabsProps,
} from './plugin-studio-v3-tabs';

afterEach(() => {
  cleanup();
});

const REPLAY_COPY =
  /Replay controls are scaffolded for V3 and will run against durable job\/attempt entities\./;

function renderTabs(props: Partial<PluginStudioV3TabsProps> = {}) {
  render(
    <PluginStudioV3Tabs
      schemaDocs={[]}
      workflows={[]}
      actionManifest={[]}
      diagnostics={[]}
      jobCount={0}
      eventLogCount={0}
      {...props}
    />,
  );
}

function expectReplayControlsDisabled() {
  expect(
    screen.getByRole('button', { name: 'Retry Job' }).hasAttribute('disabled'),
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
}

async function openExecutionLogsTab(user: ReturnType<typeof userEvent.setup>) {
  const triggerRulesTab = screen.getByRole('tab', { name: 'Trigger Rules' });
  const executionLogsTab = screen.getByRole('tab', {
    name: 'Execution Logs/Replay',
  });

  expect(triggerRulesTab.getAttribute('aria-selected')).toBe('true');
  expect(executionLogsTab.getAttribute('aria-selected')).toBe('false');

  await user.click(executionLogsTab);

  expect(triggerRulesTab.getAttribute('aria-selected')).toBe('false');
  expect(executionLogsTab.getAttribute('aria-selected')).toBe('true');
}

describe('PluginStudioV3Tabs', () => {
  it('keeps replay controls disabled when no actionable jobs are available', async () => {
    const user = userEvent.setup();
    renderTabs();

    await openExecutionLogsTab(user);

    expect(screen.getByText(REPLAY_COPY)).toBeTruthy();
    expect(screen.getByText('0 jobs')).toBeTruthy();
    expect(screen.getByText('0 log events')).toBeTruthy();
    expectReplayControlsDisabled();
  });

  it('shows execution counters when jobs and events exist', async () => {
    const user = userEvent.setup();
    renderTabs({ jobCount: 3, eventLogCount: 9 });

    await openExecutionLogsTab(user);

    expect(screen.getByText(REPLAY_COPY)).toBeTruthy();
    expect(screen.getByText('3 jobs')).toBeTruthy();
    expect(screen.getByText('9 log events')).toBeTruthy();
    expectReplayControlsDisabled();
  });
});
