import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dataMatrixActionSchema } from '../datamatrix';
import { ActionExecutor } from './action-executor';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

async function executeWithTimers(executor: ActionExecutor) {
  const executionPromise = executor.execute();
  await vi.runAllTimersAsync();
  await executionPromise;
}

describe('ActionExecutor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('executes navigate action with concrete state updates', async () => {
    const action = dataMatrixActionSchema.parse({
      version: '1.0',
      action: 'navigate',
      navigation: {
        url: 'https://supersurkhet.com/welcome',
      },
    });

    const executor = new ActionExecutor(action);
    await executeWithTimers(executor);

    const state = executor.getState();

    expect(state.phase).toBe('completed');
    expect(state.context.navigation).toEqual(
      expect.objectContaining({
        url: 'https://supersurkhet.com/welcome',
      }),
    );
    expect(
      state.history.some(
        (entry) => entry.action === 'navigate' && entry.status === 'completed',
      ),
    ).toBe(true);
  });

  it('executes equipment session action with equipment controls', async () => {
    const action = dataMatrixActionSchema.parse({
      version: '1.0',
      action: 'equipment_session',
      equipment: {
        id: 'treadmill_001',
        type: 'cardio',
        location: 'gym_floor',
      },
      session: {
        duration: 30,
        max_duration: 45,
        extendable: true,
      },
      actions: {
        on_start: {
          type: 'equipment_control',
          command: 'activate',
        },
        on_end: {
          type: 'equipment_control',
          command: 'deactivate',
        },
      },
    });

    const executor = new ActionExecutor(action);
    await executeWithTimers(executor);

    const state = executor.getState();

    expect(state.phase).toBe('completed');
    expect(state.context.equipmentSession).toEqual(
      expect.objectContaining({
        equipmentId: 'treadmill_001',
        duration: 30,
      }),
    );
    expect(
      state.history.some(
        (entry) =>
          entry.action === 'equipment_control.activate' &&
          entry.status === 'completed',
      ),
    ).toBe(true);
    expect(
      state.history.some(
        (entry) =>
          entry.action === 'equipment_control.deactivate' &&
          entry.status === 'completed',
      ),
    ).toBe(true);
  });

  it('uses injected loaders and side effects during execution', async () => {
    const action = dataMatrixActionSchema.parse({
      version: '1.0',
      action: 'navigate',
      wifi: {
        ssid: 'CafeWifi',
        password: 'secret',
        security: 'WPA2',
      },
      navigation: {
        url: 'https://supersurkhet.com/check-in',
      },
      post_connect: {
        notification: {
          title: 'Welcome',
          message: 'Session is ready',
        },
      },
    });

    const loadUserProfile = vi.fn(async () => ({ id: 'user_99' }));
    const loadBusinessData = vi.fn(async () => ({ id: 'biz_99' }));
    const loadRealTimeInfo = vi.fn(async () => ({ online: true }));
    const connectWiFi = vi.fn();
    const navigate = vi.fn();
    const notify = vi.fn();

    const executor = new ActionExecutor(action, {
      loaders: {
        loadUserProfile,
        loadBusinessData,
        loadRealTimeInfo,
      },
      sideEffects: {
        connectWiFi,
        navigate,
        notify,
      },
    });

    await executeWithTimers(executor);

    const state = executor.getState();

    expect(loadUserProfile).toHaveBeenCalledTimes(1);
    expect(loadBusinessData).toHaveBeenCalledTimes(1);
    expect(loadRealTimeInfo).toHaveBeenCalledTimes(1);
    expect(connectWiFi).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(state.userData).toEqual({ id: 'user_99' });
    expect(state.context.business).toEqual({ id: 'biz_99' });
    expect(state.context.realtime).toEqual({ online: true });
  });

  it('derives default business context from action payload instead of static mocks', async () => {
    const action = dataMatrixActionSchema.parse({
      version: '1.0',
      action: 'restaurant_ordering',
      restaurant: {
        id: 'anjal_restaurant',
        table: 'table_5',
      },
      flow: {
        steps: [
          {
            step: 1,
            type: 'menu_display',
          },
        ],
      },
    });

    const executor = new ActionExecutor(action);
    await executeWithTimers(executor);

    const state = executor.getState();
    const businessContext = state.context.business as Record<string, unknown>;

    expect(businessContext.action).toBe('restaurant_ordering');
    expect(businessContext.restaurantId).toBe('anjal_restaurant');
    expect(businessContext.id).toBeUndefined();
    expect(businessContext.name).toBeUndefined();
  });
});
