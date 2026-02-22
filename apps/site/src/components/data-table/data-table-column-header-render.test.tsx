import type { Column } from '@tanstack/react-table';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataTableColumnHeader } from './data-table-column-header';

function createColumnStub(): Column<Record<string, unknown>, unknown> {
  return {
    id: 'title',
    getCanSort: () => true,
    getCanHide: () => true,
    getIsSorted: () => false,
    getIsVisible: () => true,
    toggleSorting: () => {
      // noop for render-only contract test
    },
    clearSorting: () => {
      // noop for render-only contract test
    },
    toggleVisibility: () => {
      // noop for render-only contract test
    },
  } as unknown as Column<Record<string, unknown>, unknown>;
}

describe('DataTableColumnHeader render contract', () => {
  it('renders a single column actions trigger when column move is enabled', () => {
    const html = renderToStaticMarkup(
      <DataTableColumnHeader
        column={createColumnStub()}
        title="Title"
        onMoveColumn={() => {
          // noop for render-only contract test
        }}
      />,
    );

    expect(html).toContain('Title');
    expect((html.match(/Column actions/g) ?? []).length).toBe(1);
  });
});
