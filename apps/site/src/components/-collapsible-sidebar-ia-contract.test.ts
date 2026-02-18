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
    expect(content).toContain('sidebar-frequent-tabs');
    expect(content).toContain('sidebar-group-state');
    expect(content).toContain('aria-expanded={isGroupOpen}');
    expect(content).toContain('aria-expanded={isFrequentOpen}');
    expect(content).toContain(
      'const [groupOpenState, setGroupOpenState] = useState',
    );
  });
});
