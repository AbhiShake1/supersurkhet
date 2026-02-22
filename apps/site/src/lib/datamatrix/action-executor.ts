/**
 * Progressive Action Executor for DataMatrix Actions.
 *
 * Executes action payloads in phases while keeping deterministic state/history
 * so UI consumers can surface accurate execution progress.
 */

import { toast } from 'sonner';
import type { DataMatrixAction } from '../datamatrix';

type ActionHistoryStatus = 'started' | 'completed' | 'failed' | 'skipped';

type ActionHistoryEntry = {
  timestamp: number;
  action: string;
  status: ActionHistoryStatus;
};

export interface ActionExecutorState {
  phase: 'initial' | 'context_loading' | 'interactive' | 'completed' | 'error';
  context: Record<string, unknown>;
  userData: Record<string, unknown> | null;
  permissions: string[];
  history: ActionHistoryEntry[];
}

type ActionExecutorRuntime = {
  action: DataMatrixAction;
  state: ActionExecutorState;
};

type ActionExecutorLoaders = {
  loadUserProfile?: (
    runtime: ActionExecutorRuntime,
  ) => Promise<Record<string, unknown> | null | undefined>;
  loadBusinessData?: (
    runtime: ActionExecutorRuntime,
  ) => Promise<Record<string, unknown> | null | undefined>;
  loadRealTimeInfo?: (
    runtime: ActionExecutorRuntime,
  ) => Promise<Record<string, unknown> | null | undefined>;
};

type ActionExecutorSideEffects = {
  connectWiFi?: (
    wifiConfig: NonNullable<DataMatrixAction['wifi']>,
    runtime: ActionExecutorRuntime,
  ) => Promise<void> | void;
  navigate?: (
    navigation: NonNullable<DataMatrixAction['navigation']>,
    runtime: ActionExecutorRuntime,
  ) => Promise<void> | void;
  notify?: (
    notification: NonNullable<
      NonNullable<DataMatrixAction['post_connect']>['notification']
    >,
    runtime: ActionExecutorRuntime,
  ) => Promise<void> | void;
  equipmentControl?: (
    command: 'activate' | 'extend_session' | 'deactivate',
    parameters: Record<string, string>,
    runtime: ActionExecutorRuntime,
  ) => Promise<void> | void;
};

interface ActionExecutorOptions {
  stepDelayMs?: number;
  loaders?: ActionExecutorLoaders;
  sideEffects?: ActionExecutorSideEffects;
}

function ensureRecord(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

export class ActionExecutor {
  private action: DataMatrixAction;
  private state: ActionExecutorState;
  private progressCallbacks: Array<(state: ActionExecutorState) => void> = [];
  private errorCallback: ((error: Error) => void) | null = null;
  private readonly stepDelayMs: number;
  private readonly loaders: ActionExecutorLoaders;
  private readonly sideEffects: ActionExecutorSideEffects;
  private navigationHandled = false;
  private notificationHandled = false;

  constructor(
    actionDefinition: DataMatrixAction,
    options: ActionExecutorOptions = {},
  ) {
    this.action = actionDefinition;
    this.stepDelayMs = options.stepDelayMs ?? 180;
    this.loaders = options.loaders ?? {};
    this.sideEffects = options.sideEffects ?? {};
    this.state = {
      phase: 'initial',
      context: {},
      userData: null,
      permissions: [],
      history: [],
    };
  }

  /**
   * Register a callback to receive progress updates.
   */
  onProgress(callback: (state: ActionExecutorState) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Register a callback to handle errors.
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Execute the action progressively.
   */
  async execute(): Promise<void> {
    try {
      this.logHistory('execution_started', 'started');

      await this.executePhase1();

      const phase2Tasks = this.executePhase2();
      await this.executePhase3();
      await Promise.allSettled(phase2Tasks);

      this.state.phase = 'completed';
      this.logHistory('execution_completed', 'completed');
      this.notifyProgress();
    } catch (error) {
      this.state.phase = 'error';
      this.logHistory('execution_error', 'failed');
      this.notifyProgress();

      if (this.errorCallback) {
        this.errorCallback(
          error instanceof Error ? error : new Error(String(error)),
        );
      } else {
        console.error('Action execution error:', error);
        toast.error(
          `Failed to execute action: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      throw error;
    }
  }

  /**
   * Phase 1: immediate actions.
   */
  private async executePhase1(): Promise<void> {
    this.state.phase = 'initial';
    this.notifyProgress();

    if (this.action.wifi) {
      await this.connectWiFi(this.action.wifi);
    }

    this.state.phase = 'context_loading';
    this.notifyProgress();
  }

  /**
   * Phase 2: contextual loading in background.
   */
  private executePhase2(): Array<Promise<void>> {
    const userProfileTask = this.loadUserProfile()
      .then((profile) => {
        this.state.userData = profile;
        this.notifyProgress();
      })
      .catch((error) => {
        this.logHistory('load_user_profile', 'failed');
        console.warn('Failed to load user profile:', error);
      });

    const businessDataTask = this.loadBusinessData()
      .then((data) => {
        this.state.context.business = data;
        this.notifyProgress();
      })
      .catch((error) => {
        this.logHistory('load_business_data', 'failed');
        console.warn('Failed to load business data:', error);
      });

    const realTimeTask = this.loadRealTimeInfo()
      .then((info) => {
        this.state.context.realtime = info;
        this.notifyProgress();
      })
      .catch((error) => {
        this.logHistory('load_realtime_info', 'failed');
        console.warn('Failed to load real-time info:', error);
      });

    return [userProfileTask, businessDataTask, realTimeTask];
  }

  /**
   * Phase 3: action-specific execution.
   */
  private async executePhase3(): Promise<void> {
    this.state.phase = 'interactive';
    this.notifyProgress();

    switch (this.action.action) {
      case 'wifi_connect':
        this.logHistory('wifi_connect', 'completed');
        break;
      case 'navigate':
        await this.executeNavigation();
        break;
      case 'notification':
        await this.executeNotification(this.action.post_connect?.notification);
        break;
      case 'profile_enrichment':
        await this.executeProfileEnrichment();
        break;
      case 'equipment_session':
        await this.executeEquipmentSession();
        break;
      case 'restaurant_ordering':
        await this.executeRestaurantOrdering();
        break;
      case 'product_interaction':
        await this.executeProductInteraction();
        break;
      case 'form_request':
        await this.executeStandaloneFormRequest();
        break;
      case 'choice_selection':
        await this.executeStandaloneChoiceSelection();
        break;
      case 'equipment_control':
        await this.executeEquipmentControlAction();
        break;
      default:
        this.logHistory(`action.${this.action.action}`, 'skipped');
        break;
    }

    if (!this.navigationHandled && this.action.navigation) {
      await this.executeNavigation();
    }

    if (!this.notificationHandled && this.action.post_connect?.notification) {
      await this.executeNotification(this.action.post_connect.notification);
    }

    if (this.action.on_complete) {
      await this.executeOnComplete(this.action.on_complete);
    }
  }

  /**
   * Connect to WiFi network.
   */
  private async connectWiFi(
    wifiConfig: NonNullable<DataMatrixAction['wifi']>,
  ): Promise<void> {
    if (!wifiConfig.ssid.trim()) {
      this.logHistory('wifi_connect', 'skipped');
      return;
    }

    this.logHistory('wifi_connect', 'started');
    await this.sleep(this.stepDelayMs);

    if (this.sideEffects.connectWiFi) {
      await this.sideEffects.connectWiFi(wifiConfig, this.getRuntimeSnapshot());
    }

    this.state.context.wifi = {
      ssid: wifiConfig.ssid,
      security: wifiConfig.security ?? 'WPA2',
      connectedAt: Date.now(),
    };

    this.logHistory('wifi_connect', 'completed');
    if (!this.sideEffects.connectWiFi) {
      toast.success(`Connected to WiFi network: ${wifiConfig.ssid}`);
    }
  }

  private async executeNavigation(): Promise<void> {
    if (!this.action.navigation) {
      this.logHistory('navigate', 'skipped');
      return;
    }

    this.logHistory('navigate', 'started');
    await this.sleep(this.stepDelayMs);

    if (this.sideEffects.navigate) {
      await this.sideEffects.navigate(
        this.action.navigation,
        this.getRuntimeSnapshot(),
      );
    }

    this.state.context.navigation = {
      url: this.action.navigation.url,
      params: this.action.navigation.params ?? {},
      timestamp: Date.now(),
    };

    this.navigationHandled = true;
    this.logHistory('navigate', 'completed');
    if (!this.sideEffects.navigate) {
      toast.info(`Navigate to ${this.action.navigation.url}`);
    }
  }

  private async executeNotification(
    notification:
      | NonNullable<DataMatrixAction['post_connect']>['notification']
      | undefined,
  ): Promise<void> {
    if (!notification) {
      this.logHistory('notification', 'skipped');
      return;
    }

    this.logHistory('notification', 'started');
    await this.sleep(this.stepDelayMs);

    if (this.sideEffects.notify) {
      await this.sideEffects.notify(notification, this.getRuntimeSnapshot());
    }

    this.state.context.notification = {
      title: notification.title,
      message: notification.message,
      timestamp: Date.now(),
    };

    this.notificationHandled = true;
    this.logHistory('notification', 'completed');
    if (!this.sideEffects.notify) {
      toast.success(notification.title, {
        description: notification.message,
      });
    }
  }

  private async executeProfileEnrichment(): Promise<void> {
    this.logHistory('profile_enrichment', 'started');

    const checks = this.action.checks ?? [];
    if (checks.length === 0) {
      this.logHistory('profile_enrichment', 'skipped');
      return;
    }

    const requestedFields: string[] = [];

    for (const check of checks) {
      requestedFields.push(check.field);

      if (check.if_missing?.type === 'form_request') {
        await this.executeFormRequest(check.field, check.if_missing.schema);
      }

      if (check.if_missing?.type === 'choice_selection') {
        await this.executeChoiceSelection(
          check.field,
          check.if_missing.options,
        );
      }
    }

    this.state.context.profileEnrichment = {
      requestedFields,
      checkCount: checks.length,
    };

    this.logHistory('profile_enrichment', 'completed');
  }

  private async executeStandaloneFormRequest(): Promise<void> {
    const check = this.action.checks?.find(
      (item) => item.if_missing?.type === 'form_request',
    );

    await this.executeFormRequest(
      check?.field ?? 'custom_field',
      check?.if_missing?.schema,
    );
  }

  private async executeStandaloneChoiceSelection(): Promise<void> {
    const check = this.action.checks?.find(
      (item) => item.if_missing?.type === 'choice_selection',
    );

    await this.executeChoiceSelection(
      check?.field ?? 'selection',
      check?.if_missing?.options,
    );
  }

  private async executeFormRequest(
    field: string,
    schema:
      | {
          title: string;
          fields?: Array<{
            name: string;
            type: string;
            required?: boolean;
            label: string;
          }>;
        }
      | undefined,
  ): Promise<void> {
    this.logHistory('form_request', 'started');
    await this.sleep(this.stepDelayMs);

    const pendingForms =
      (this.state.context.pendingForms as Array<Record<string, unknown>>) ?? [];

    pendingForms.push({
      field,
      title: schema?.title ?? `Provide ${field}`,
      fields: schema?.fields ?? [],
    });

    this.state.context.pendingForms = pendingForms;
    this.logHistory('form_request', 'completed');
  }

  private async executeChoiceSelection(
    field: string,
    options:
      | Array<{
          value: string;
          label: string;
        }>
      | undefined,
  ): Promise<void> {
    this.logHistory('choice_selection', 'started');
    await this.sleep(this.stepDelayMs);

    const pendingChoices =
      (this.state.context.pendingChoices as Array<Record<string, unknown>>) ??
      [];

    pendingChoices.push({
      field,
      options: options ?? [],
    });

    this.state.context.pendingChoices = pendingChoices;
    this.logHistory('choice_selection', 'completed');
  }

  private async executeEquipmentSession(): Promise<void> {
    if (!this.action.equipment || !this.action.session) {
      throw new Error(
        'equipment_session action requires both equipment and session fields',
      );
    }

    this.logHistory('equipment_session', 'started');
    await this.sleep(this.stepDelayMs);

    this.state.context.equipmentSession = {
      equipmentId: this.action.equipment.id,
      equipmentType: this.action.equipment.type,
      location: this.action.equipment.location,
      duration: this.action.session.duration,
      maxDuration:
        this.action.session.max_duration ?? this.action.session.duration,
      extendable: this.action.session.extendable ?? false,
    };

    if (this.action.actions?.on_start?.type === 'equipment_control') {
      await this.executeEquipmentControlCommand(
        this.action.actions.on_start.command,
        this.action.actions.on_start.parameters,
      );
    }

    if (
      this.action.actions?.on_extend?.actions?.confirm?.type ===
      'equipment_control'
    ) {
      await this.executeEquipmentControlCommand('extend_session', {
        duration: String(
          this.action.actions.on_extend.actions.confirm.duration,
        ),
      });
    }

    if (this.action.actions?.on_end?.type === 'equipment_control') {
      await this.executeEquipmentControlCommand(
        this.action.actions.on_end.command,
      );
    }

    this.logHistory('equipment_session', 'completed');
  }

  private async executeEquipmentControlAction(): Promise<void> {
    this.logHistory('equipment_control', 'started');

    let commandsExecuted = 0;

    if (this.action.actions?.on_start?.type === 'equipment_control') {
      commandsExecuted += 1;
      await this.executeEquipmentControlCommand(
        this.action.actions.on_start.command,
        this.action.actions.on_start.parameters,
      );
    }

    if (
      this.action.actions?.on_extend?.actions?.confirm?.type ===
      'equipment_control'
    ) {
      commandsExecuted += 1;
      await this.executeEquipmentControlCommand('extend_session', {
        duration: String(
          this.action.actions.on_extend.actions.confirm.duration,
        ),
      });
    }

    if (this.action.actions?.on_end?.type === 'equipment_control') {
      commandsExecuted += 1;
      await this.executeEquipmentControlCommand(
        this.action.actions.on_end.command,
      );
    }

    if (commandsExecuted === 0) {
      this.logHistory('equipment_control', 'skipped');
      return;
    }

    this.logHistory('equipment_control', 'completed');
  }

  private async executeEquipmentControlCommand(
    command: 'activate' | 'extend_session' | 'deactivate',
    parameters?: Record<string, string>,
  ): Promise<void> {
    const actionName = `equipment_control.${command}`;
    this.logHistory(actionName, 'started');
    await this.sleep(this.stepDelayMs);

    const safeParameters = parameters ?? {};
    if (this.sideEffects.equipmentControl) {
      await this.sideEffects.equipmentControl(
        command,
        safeParameters,
        this.getRuntimeSnapshot(),
      );
    }

    const commandHistory =
      (this.state.context.equipmentCommands as Array<
        Record<string, unknown>
      >) ?? [];

    commandHistory.push({
      command,
      parameters: safeParameters,
      timestamp: Date.now(),
    });

    this.state.context.equipmentCommands = commandHistory;
    this.logHistory(actionName, 'completed');
  }

  private async executeRestaurantOrdering(): Promise<void> {
    if (!this.action.restaurant) {
      throw new Error('restaurant_ordering action requires restaurant details');
    }

    this.logHistory('restaurant_ordering', 'started');
    await this.sleep(this.stepDelayMs);

    const steps = [...(this.action.flow?.steps ?? [])].sort(
      (a, b) => a.step - b.step,
    );

    const executedSteps: string[] = [];

    for (const step of steps) {
      const stepAction = `restaurant_ordering.step_${step.step}.${step.type}`;
      this.logHistory(stepAction, 'started');
      await this.sleep(Math.max(80, this.stepDelayMs / 2));
      this.logHistory(stepAction, 'completed');
      executedSteps.push(step.type);
    }

    this.state.context.restaurantSession = {
      restaurantId: this.action.restaurant.id,
      table: this.action.restaurant.table,
      steps: executedSteps,
    };

    this.logHistory('restaurant_ordering', 'completed');
  }

  private async executeProductInteraction(): Promise<void> {
    if (!this.action.product) {
      throw new Error('product_interaction action requires product details');
    }

    this.logHistory('product_interaction', 'started');
    await this.sleep(this.stepDelayMs);

    const interactionTypes = Object.entries(this.action.interactions ?? {})
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);

    for (const interaction of interactionTypes) {
      const interactionAction = `product_interaction.${interaction}`;
      this.logHistory(interactionAction, 'started');
      await this.sleep(Math.max(80, this.stepDelayMs / 2));
      this.logHistory(interactionAction, 'completed');
    }

    this.state.context.productInteraction = {
      productId: this.action.product.id,
      sku: this.action.product.sku,
      interactions: interactionTypes,
    };

    this.logHistory('product_interaction', 'completed');
  }

  private async executeOnComplete(
    onComplete: NonNullable<DataMatrixAction['on_complete']>,
  ): Promise<void> {
    if (onComplete.type === 'navigate' && onComplete.url) {
      this.action.navigation = {
        url: onComplete.url,
      };
      await this.executeNavigation();
      return;
    }

    if (onComplete.type === 'notification' && onComplete.message) {
      await this.executeNotification({
        title: 'Notification',
        message: onComplete.message,
      });
    }
  }

  /**
   * Load user profile.
   */
  private async loadUserProfile(): Promise<Record<string, unknown>> {
    this.logHistory('load_user_profile', 'started');
    await this.sleep(Math.max(120, this.stepDelayMs));
    const profile = this.loaders.loadUserProfile
      ? ensureRecord(
          await this.loaders.loadUserProfile(this.getRuntimeSnapshot()),
        )
      : this.getDefaultUserProfile();

    this.logHistory('load_user_profile', 'completed');
    return profile;
  }

  /**
   * Load business data.
   */
  private async loadBusinessData(): Promise<Record<string, unknown>> {
    this.logHistory('load_business_data', 'started');
    await this.sleep(Math.max(100, this.stepDelayMs - 20));
    const businessData = this.loaders.loadBusinessData
      ? ensureRecord(
          await this.loaders.loadBusinessData(this.getRuntimeSnapshot()),
        )
      : this.getDefaultBusinessData();

    this.logHistory('load_business_data', 'completed');
    return businessData;
  }

  /**
   * Load real-time information.
   */
  private async loadRealTimeInfo(): Promise<Record<string, unknown>> {
    this.logHistory('load_realtime_info', 'started');
    await this.sleep(Math.max(80, this.stepDelayMs - 40));
    const realTimeInfo = this.loaders.loadRealTimeInfo
      ? ensureRecord(
          await this.loaders.loadRealTimeInfo(this.getRuntimeSnapshot()),
        )
      : this.getDefaultRealTimeInfo();

    this.logHistory('load_realtime_info', 'completed');
    return realTimeInfo;
  }

  private getRuntimeSnapshot(): ActionExecutorRuntime {
    return {
      action: this.action,
      state: this.getState(),
    };
  }

  private getDefaultUserProfile(): Record<string, unknown> {
    const profile: Record<string, unknown> = {};
    if (typeof navigator !== 'undefined') {
      if (navigator.language) {
        profile.language = navigator.language;
      }
      if (navigator.languages?.length) {
        profile.languages = [...navigator.languages];
      }
    }

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone) {
        profile.timezone = timeZone;
      }
    } catch (_error) {
      // Some runtimes may not expose timezone resolution.
    }

    return profile;
  }

  private getDefaultBusinessData(): Record<string, unknown> {
    const businessData: Record<string, unknown> = {
      action: this.action.action,
    };

    if (this.action.restaurant?.id) {
      businessData.restaurantId = this.action.restaurant.id;
    }
    if (this.action.equipment?.id) {
      businessData.equipmentId = this.action.equipment.id;
      businessData.equipmentType = this.action.equipment.type;
      businessData.location = this.action.equipment.location;
    }
    if (this.action.product?.id) {
      businessData.productId = this.action.product.id;
      businessData.productSku = this.action.product.sku;
    }
    if (this.action.navigation?.url) {
      try {
        const parsedUrl = new URL(this.action.navigation.url);
        businessData.navigationHost = parsedUrl.host;
      } catch (_error) {
        businessData.navigationHost = this.action.navigation.url;
      }
    }

    const capabilities: string[] = [];
    if (this.action.restaurant) capabilities.push('restaurant_ordering');
    if (this.action.product) capabilities.push('product_interaction');
    if (this.action.equipment) capabilities.push('equipment_session');
    if (this.action.navigation) capabilities.push('navigation');
    if (this.action.post_connect?.notification)
      capabilities.push('notification');

    if (capabilities.length > 0) {
      businessData.capabilities = capabilities;
    }

    return businessData;
  }

  private getDefaultRealTimeInfo(): Record<string, unknown> {
    const realtime: Record<string, unknown> = {
      timestamp: Date.now(),
    };

    if (typeof navigator !== 'undefined') {
      realtime.online = navigator.onLine;
    }

    return realtime;
  }

  /**
   * Notify all progress callbacks of state changes.
   */
  private notifyProgress(): void {
    const snapshot: ActionExecutorState = {
      ...this.state,
      context: { ...this.state.context },
      userData: this.state.userData ? { ...this.state.userData } : null,
      permissions: [...this.state.permissions],
      history: [...this.state.history],
    };

    for (const callback of this.progressCallbacks) {
      callback(snapshot);
    }
  }

  /**
   * Log history of actions.
   */
  private logHistory(action: string, status: ActionHistoryStatus): void {
    this.state.history.push({
      timestamp: Date.now(),
      action,
      status,
    });
    this.notifyProgress();
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current state.
   */
  getState(): ActionExecutorState {
    return {
      ...this.state,
      context: { ...this.state.context },
      userData: this.state.userData ? { ...this.state.userData } : null,
      permissions: [...this.state.permissions],
      history: [...this.state.history],
    };
  }
}
