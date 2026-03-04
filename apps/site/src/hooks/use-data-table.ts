'use client';

import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  type Parser,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  type UseQueryStateOptions,
  useQueryState,
  useQueryStates,
} from 'nuqs';
import * as React from 'react';

import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { getSortingStateParser } from '@/lib/parsers';
import type { ExtendedColumnSort } from '@/types/data-table';

const PAGE_KEY = 'page';
const PER_PAGE_KEY = 'perPage';
const SORT_KEY = 'sort';
const ARRAY_SEPARATOR = ',';
const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;

function parseSortingFromUrl() {
  if (typeof window === 'undefined') return [];
  const rawSorting = new URL(window.location.href).searchParams.get('sort');

  if (!rawSorting) return [];

  try {
    const sorting = JSON.parse(decodeURIComponent(rawSorting));
    return sorting;
  } catch (e) {
    console.error('Failed to parse sorting:', e);
    return [];
  }
}

interface UseDataTableProps<TData>
  extends Omit<
      TableOptions<TData>,
      | 'state'
      | 'pageCount'
      | 'getCoreRowModel'
      | 'manualFiltering'
      | 'manualPagination'
      | 'manualSorting'
    >,
    Required<Pick<TableOptions<TData>, 'pageCount'>> {
  initialState?: Omit<Partial<TableState>, 'sorting'> & {
    sorting?: ExtendedColumnSort<TData>[];
  };
  history?: 'push' | 'replace';
  debounceMs?: number;
  throttleMs?: number;
  clearOnDefault?: boolean;
  enableAdvancedFilter?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  startTransition?: React.TransitionStartFunction;
  columnVisibilityStorageKey?: string;
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  'use memo';
  const {
    columns,
    pageCount = -1,
    initialState,
    history = 'replace',
    debounceMs = DEBOUNCE_MS,
    throttleMs = THROTTLE_MS,
    clearOnDefault = false,
    enableAdvancedFilter = false,
    scroll = false,
    shallow = true,
    columnVisibilityStorageKey,
    startTransition,
    ...tableProps
  } = props;

  const queryStateOptions = React.useMemo<
    Omit<UseQueryStateOptions<string>, 'parse'>
  >(
    () => ({
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition,
    }),
    [
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition,
    ],
  );

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  );
  const defaultColumnVisibility = React.useRef<VisibilityState>(
    initialState?.columnVisibility ?? {},
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => {
      const fallback = defaultColumnVisibility.current;
      if (typeof window === 'undefined' || !columnVisibilityStorageKey) {
        return fallback;
      }

      try {
        const stored = window.localStorage.getItem(columnVisibilityStorageKey);
        if (!stored) return fallback;

        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return fallback;
        }

        return parsed as VisibilityState;
      } catch {
        return fallback;
      }
    });

  React.useEffect(() => {
    if (typeof window === 'undefined' || !columnVisibilityStorageKey) return;

    try {
      const stored = window.localStorage.getItem(columnVisibilityStorageKey);
      if (!stored) {
        setColumnVisibility(defaultColumnVisibility.current);
        return;
      }

      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setColumnVisibility(defaultColumnVisibility.current);
        return;
      }

      setColumnVisibility(parsed as VisibilityState);
    } catch {
      setColumnVisibility(defaultColumnVisibility.current);
    }
  }, [columnVisibilityStorageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !columnVisibilityStorageKey) return;

    try {
      window.localStorage.setItem(
        columnVisibilityStorageKey,
        JSON.stringify(columnVisibility),
      );
    } catch {
      // Ignore storage write failures (private mode/quota exceeded)
    }
  }, [columnVisibility, columnVisibilityStorageKey]);

  const [page, setPage] = useQueryState(
    PAGE_KEY,
    parseAsInteger.withOptions(queryStateOptions).withDefault(1),
  );
  const [perPage, setPerPage] = useQueryState(
    PER_PAGE_KEY,
    parseAsInteger
      .withOptions(queryStateOptions)
      .withDefault(initialState?.pagination?.pageSize ?? 10),
  );

  const pagination: PaginationState = React.useMemo(() => {
    return {
      pageIndex: page - 1, // zero-based index -> one-based index
      pageSize: perPage,
    };
  }, [page, perPage]);

  const onPaginationChange = (updaterOrValue: Updater<PaginationState>) => {
    if (typeof updaterOrValue === 'function') {
      const newPagination = updaterOrValue(pagination);
      void setPage(newPagination.pageIndex + 1);
      void setPerPage(newPagination.pageSize);
    } else {
      void setPage(updaterOrValue.pageIndex + 1);
      void setPerPage(updaterOrValue.pageSize);
    }
  };

  const columnIds = React.useMemo(() => {
    return new Set(
      columns.map((column) => column.id).filter(Boolean) as string[],
    );
  }, [columns]);

  const defaultSorting = React.useMemo(() => {
    return parseSortingFromUrl();
  }, []);

  const [sorting, setSorting] = useQueryState(
    SORT_KEY,
    getSortingStateParser<TData>(columnIds)
      .withOptions(queryStateOptions)
      .withDefault(initialState?.sorting ?? defaultSorting ?? []),
  );

  const onSortingChange = (updaterOrValue: Updater<SortingState>) => {
    if (typeof updaterOrValue === 'function') {
      const newSorting = updaterOrValue(sorting);
      setSorting(newSorting as ExtendedColumnSort<TData>[]);
    } else {
      setSorting(updaterOrValue as ExtendedColumnSort<TData>[]);
    }
  };

  const filterableColumns = React.useMemo(() => {
    if (enableAdvancedFilter) return [];

    return columns.filter((column) => column.enableColumnFilter);
  }, [columns, enableAdvancedFilter]);

  const filterParsers = React.useMemo(() => {
    if (enableAdvancedFilter) return {};

    return filterableColumns.reduce<
      Record<string, Parser<string> | Parser<string[]>>
    >((acc, column) => {
      if (column.meta?.options) {
        acc[column.id ?? ''] = parseAsArrayOf(
          parseAsString,
          ARRAY_SEPARATOR,
        ).withOptions(queryStateOptions);
      } else {
        acc[column.id ?? ''] = parseAsString.withOptions(queryStateOptions);
      }
      return acc;
    }, {});
  }, [filterableColumns, queryStateOptions, enableAdvancedFilter]);

  const [filterValues, setFilterValues] = useQueryStates(filterParsers);

  const debouncedSetFilterValues = useDebouncedCallback(
    (values: typeof filterValues) => {
      void setPage(1);
      void setFilterValues(values);
    },
    debounceMs,
  );

  const initialColumnFilters: ColumnFiltersState = React.useMemo(() => {
    if (enableAdvancedFilter) return [];

    return Object.entries(filterValues).reduce<ColumnFiltersState>(
      (filters, [key, value]) => {
        if (value !== null) {
          const processedValue = Array.isArray(value)
            ? value
            : typeof value === 'string' && /[^a-zA-Z0-9]/.test(value)
              ? value.split(/[^a-zA-Z0-9]+/).filter(Boolean)
              : [value];

          filters.push({
            id: key,
            value: processedValue,
          });
        }
        return filters;
      },
      [],
    );
  }, [filterValues, enableAdvancedFilter]);

  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialColumnFilters);

  const onColumnFiltersChange = (
    updaterOrValue: Updater<ColumnFiltersState>,
  ) => {
    if (enableAdvancedFilter) return;

    setColumnFilters((prev) => {
      const next =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(prev)
          : updaterOrValue;

      const filterUpdates = next.reduce<
        Record<string, string | string[] | null>
      >((acc, filter) => {
        if (filterableColumns.find((column) => column.id === filter.id)) {
          acc[filter.id] = filter.value as string | string[];
        }
        return acc;
      }, {});

      for (const prevFilter of prev) {
        if (!next.some((filter) => filter.id === prevFilter.id)) {
          filterUpdates[prevFilter.id] = null;
        }
      }

      debouncedSetFilterValues(filterUpdates);
      return next;
    });
  };

  const table = useReactTable({
    ...tableProps,
    columns,
    initialState,
    pageCount,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return { table, shallow, debounceMs, throttleMs };
}
