import { describe, expect, it } from 'vitest';
import { getAutoTableInitialState } from './initial-state';

describe('getAutoTableInitialState', () => {
  it('omits columnPinning when pinning is disabled', () => {
    const initialState = getAutoTableInitialState({
      defaultPageSize: 10,
      enableColumnPinning: false,
      pageIndex: 0,
    });

    expect(initialState).not.toHaveProperty('columnPinning');
  });

  it('sets right action column pinning when enabled', () => {
    const initialState = getAutoTableInitialState({
      defaultPageSize: 20,
      enableColumnPinning: true,
      pageIndex: 1,
    });

    expect(initialState.columnPinning).toEqual({ right: ['actions'] });
    expect(initialState.pagination).toEqual({ pageIndex: 1, pageSize: 20 });
  });
});
