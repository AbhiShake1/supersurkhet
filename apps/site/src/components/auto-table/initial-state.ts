import type { DataTableInitialState } from '@/hooks/use-data-table';

interface GetAutoTableInitialStateOptions {
  defaultPageSize: number;
  enableColumnPinning: boolean;
  pageIndex: number;
}

export function getAutoTableInitialState({
  defaultPageSize,
  enableColumnPinning,
  pageIndex,
}: GetAutoTableInitialStateOptions): DataTableInitialState<unknown> {
  const baseState: DataTableInitialState<unknown> = {
    pagination: {
      pageIndex,
      pageSize: defaultPageSize,
    },
    columnVisibility: {},
  };

  return enableColumnPinning
    ? {
        ...baseState,
        columnPinning: { right: ['actions'] },
      }
    : baseState;
}
