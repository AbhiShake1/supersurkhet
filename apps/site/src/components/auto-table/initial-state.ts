import type { InitialTableState } from '@tanstack/react-table';

interface GetAutoTableInitialStateOptions {
  defaultPageSize: number;
  enableColumnPinning: boolean;
  pageIndex: number;
}

export function getAutoTableInitialState({
  defaultPageSize,
  enableColumnPinning,
  pageIndex,
}: GetAutoTableInitialStateOptions): InitialTableState {
  const baseState: InitialTableState = {
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
