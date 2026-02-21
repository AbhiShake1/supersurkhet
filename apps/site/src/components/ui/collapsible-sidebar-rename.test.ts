import { afterEach, describe, expect, it, vi } from 'vitest';
import { commitSidebarRename } from './collapsible-sidebar-rename';

describe('commitSidebarRename', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('commits rename when next value is valid and handler exists', () => {
    const onRename = vi.fn();

    const committed = commitSidebarRename({
      entity: 'tab',
      previousValue: 'Orders',
      nextValue: 'Orders QA',
      onRename,
    });

    expect(committed).toBe(true);
    expect(onRename).toHaveBeenCalledWith('Orders', 'Orders QA');
  });

  it('logs error instead of failing silently when handler is missing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const committed = commitSidebarRename({
      entity: 'group',
      previousValue: 'Operations',
      nextValue: 'Operations QA',
    });

    expect(committed).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      '[collapsible-sidebar] Missing rename handler',
      expect.objectContaining({
        entity: 'group',
        previousValue: 'Operations',
        nextValue: 'Operations QA',
      }),
    );
  });

  it('logs error instead of failing silently when handler throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const committed = commitSidebarRename({
      entity: 'tab',
      previousValue: 'Orders',
      nextValue: 'Orders QA',
      onRename: () => {
        throw new Error('db write failed');
      },
    });

    expect(committed).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      '[collapsible-sidebar] Rename failed',
      expect.objectContaining({
        entity: 'tab',
        previousValue: 'Orders',
        nextValue: 'Orders QA',
      }),
      expect.any(Error),
    );
  });

  it('ignores empty or unchanged rename values', () => {
    const onRename = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const unchanged = commitSidebarRename({
      entity: 'tab',
      previousValue: 'Orders',
      nextValue: ' Orders ',
      onRename,
    });
    const empty = commitSidebarRename({
      entity: 'tab',
      previousValue: 'Orders',
      nextValue: '   ',
      onRename,
    });

    expect(unchanged).toBe(false);
    expect(empty).toBe(false);
    expect(onRename).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
