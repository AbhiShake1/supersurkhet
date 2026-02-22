import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const columnHeaderPath = resolve(
  process.cwd(),
  'src/components/data-table/data-table-column-header.tsx',
);

function getColumnHeaderContent() {
  return readFileSync(columnHeaderPath, 'utf8');
}

describe('data-table column header contract', () => {
  it('includes edit and delete actions with sorting controls', () => {
    const content = getColumnHeaderContent();

    expect(content).toContain('Edit Column');
    expect(content).toContain('Delete Column');
  });

  it('supports dragging headers to reorder columns', () => {
    const content = getColumnHeaderContent();

    expect(content).toContain('onMoveColumn');
    expect(content).toContain('draggable');
    expect(content).toContain('onDragStart={handleDragStart}');
  });
});
