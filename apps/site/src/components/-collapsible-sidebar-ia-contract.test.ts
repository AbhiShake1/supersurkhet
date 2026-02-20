import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sidebarPath = resolve(
  process.cwd(),
  'src/components/ui/collapsible-sidebar.tsx',
);

function getSidebarContent() {
  return readFileSync(sidebarPath, 'utf8');
}

describe('collapsible sidebar information architecture contract', () => {
  it('supports frequent links and expandable navigation groups', () => {
    const content = getSidebarContent();

    expect(content).toContain('Frequently used');
    expect(content).toContain('item.title !== currentTab');
    expect(content).toContain('aria-expanded={isGroupOpen}');
    expect(content).toContain('aria-expanded={isFrequentOpen}');
    expect(content).toContain(
      'const [groupOpenState, setGroupOpenState] = useState',
    );
  });

  it('persists operational sidebar state via user preferences store', () => {
    const content = getSidebarContent();

    expect(content).toContain('loadSidebarPreferences');
    expect(content).toContain('saveSidebarPreferences');
    expect(content).not.toContain('window.localStorage.getItem');
    expect(content).not.toContain('window.localStorage.setItem');
  });

  it('supports hover workflow settings actions for editable table tabs', () => {
    const content = getSidebarContent();

    expect(content).toContain(
      'onOpenWorkflowEditorForTab?: (tabTitle: string) => void;',
    );
    expect(content).toContain(
      'onDeleteTableForTab?: (tabTitle: string) => void;',
    );
    expect(content).toContain('group-hover/option:opacity-100');
    expect(content).toContain('Workflow settings for');
    expect(content).toContain('Delete table');
    expect(content).toContain('onOpenWorkflowEditor={');
    expect(content).toContain('onRequestDeleteTable={');
  });
});
