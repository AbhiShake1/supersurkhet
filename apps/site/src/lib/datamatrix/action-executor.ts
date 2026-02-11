/**
 * Progressive Action Executor for DataMatrix Actions
 *
 * This engine executes complex DataMatrix actions progressively to maintain
 * responsive user experience while performing sophisticated workflows.
 */

import { toast } from 'sonner';
import type { DataMatrixAction } from '../datamatrix';

export interface ActionExecutorState {
  phase: 'initial' | 'context_loading' | 'interactive' | 'completed' | 'error';
  context: Record<string, unknown>;
  userData: Record<string, unknown> | null;
  permissions: string[];
  history: Array<{ timestamp: number; action: string; status: string }>;
}

export class ActionExecutor {
  private action: DataMatrixAction;
  private state: ActionExecutorState;
  private progressCallbacks: Array<(state: ActionExecutorState) => void> = [];
  private errorCallback: ((error: Error) => void) | null = null;

  constructor(actionDefinition: DataMatrixAction) {
    this.action = actionDefinition;
    this.state = {
      phase: 'initial',
      context: {},
      userData: null,
      permissions: [],
      history: [],
    };
  }

  /**
   * Register a callback to receive progress updates
   */
  onProgress(callback: (state: ActionExecutorState) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Register a callback to handle errors
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Execute the action progressively
   */
  async execute(): Promise<void> {
    try {
      // Log start of execution
      this.logHistory('execution_started', 'started');

      // Phase 1: Immediate Actions (0-2 seconds)
      await this.executePhase1();

      // Phase 2: Contextual Loading (non-blocking, 2-5 seconds)
      this.executePhase2();

      // Phase 3: Interactive Experience (5+ seconds)
      await this.executePhase3();

      // Mark as completed
      this.state.phase = 'completed';
      this.logHistory('execution_completed', 'completed');
      this.notifyProgress();
    } catch (error) {
      this.state.phase = 'error';
      this.logHistory('execution_error', 'error');
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
   * Phase 1: Immediate Actions
   * Execute time-critical actions immediately (WiFi connection, basic authentication)
   */
  private async executePhase1(): Promise<void> {
    this.state.phase = 'initial';
    this.notifyProgress();

    // Execute WiFi connection if present
    if (this.action.wifi) {
      await this.connectWiFi(this.action.wifi);
    }

    // Execute basic authentication if present
    // (In a real implementation, this would handle authentication)

    // Update state
    this.state.phase = 'context_loading';
    this.notifyProgress();
  }

  /**
   * Phase 2: Contextual Loading
   * Fetch user profile and contextual data in the background
   */
  private executePhase2(): void {
    // Load user profile in background
    this.loadUserProfile()
      .then((profile) => {
        this.state.userData = profile;
        this.notifyProgress();
      })
      .catch((error) => {
        console.warn('Failed to load user profile:', error);
      });

    // Load business data in background
    this.loadBusinessData()
      .then((data) => {
        this.state.context.business = data;
        this.notifyProgress();
      })
      .catch((error) => {
        console.warn('Failed to load business data:', error);
      });

    // Load real-time info in background
    this.loadRealTimeInfo()
      .then((info) => {
        this.state.context.realtime = info;
        this.notifyProgress();
      })
      .catch((error) => {
        console.warn('Failed to load real-time info:', error);
      });
  }

  /**
   * Phase 3: Interactive Experience
   * Build interactive experience based on action type
   */
  private async executePhase3(): Promise<void> {
    this.state.phase = 'interactive';
    this.notifyProgress();

    // Handle different action types
    switch (this.action.action) {
      case 'wifi_connect':
        // Already handled in Phase 1
        break;

      case 'navigate':
        if (this.action.navigation) {
          // In a real implementation, this would navigate to the URL
          console.log('Would navigate to:', this.action.navigation.url);
          toast.info(`Would navigate to: ${this.action.navigation.url}`);
        }
        break;

      case 'notification':
        if (this.action.post_connect?.notification) {
          toast.success(this.action.post_connect.notification.title, {
            description: this.action.post_connect.notification.message,
          });
        }
        break;

      case 'profile_enrichment':
        // Handle profile enrichment
        if (this.action.checks) {
          for (const check of this.action.checks) {
            if (check.if_missing) {
              switch (check.if_missing.type) {
                case 'form_request':
                  // In a real implementation, this would show a form
                  toast.info('Form request action detected');
                  break;
                case 'choice_selection':
                  // In a real implementation, this would show choices
                  toast.info('Choice selection action detected');
                  break;
              }
            }
          }
        }
        break;

      default:
        // Handle other action types
        toast.info(`Action type '${this.action.action}' executed`);
        break;
    }
  }

  /**
   * Connect to WiFi network
   */
  private async connectWiFi(
    wifiConfig: NonNullable<DataMatrixAction['wifi']>,
  ): Promise<void> {
    this.logHistory('wifi_connect', 'starting');

    // Simulate WiFi connection (in a real implementation, this would connect to WiFi)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logHistory('wifi_connect', 'completed');
    toast.success(`Connected to WiFi network: ${wifiConfig.ssid}`);
  }

  /**
   * Load user profile
   */
  private async loadUserProfile(): Promise<Record<string, unknown>> {
    this.logHistory('load_user_profile', 'starting');

    // Simulate loading user profile (in a real implementation, this would fetch from GunDB)
    await new Promise((resolve) => setTimeout(resolve, 800));

    const profile = {
      id: 'user_123',
      name: 'John Doe',
      email: 'john@example.com',
      preferences: {
        language: 'en',
        theme: 'dark',
      },
    };

    this.logHistory('load_user_profile', 'completed');
    return profile;
  }

  /**
   * Load business data
   */
  private async loadBusinessData(): Promise<Record<string, unknown>> {
    this.logHistory('load_business_data', 'starting');

    // Simulate loading business data
    await new Promise((resolve) => setTimeout(resolve, 600));

    const businessData = {
      id: 'business_456',
      name: 'Sample Business',
      location: 'Surkhet, Nepal',
      features: ['ordering', 'reservations', 'delivery'],
    };

    this.logHistory('load_business_data', 'completed');
    return businessData;
  }

  /**
   * Load real-time information
   */
  private async loadRealTimeInfo(): Promise<Record<string, unknown>> {
    this.logHistory('load_realtime_info', 'starting');

    // Simulate loading real-time info
    await new Promise((resolve) => setTimeout(resolve, 400));

    const realTimeInfo = {
      timestamp: Date.now(),
      availability: 'high',
      promotions: ['20% off today'],
    };

    this.logHistory('load_realtime_info', 'completed');
    return realTimeInfo;
  }

  /**
   * Notify all progress callbacks of state changes
   */
  private notifyProgress(): void {
    for (const callback of this.progressCallbacks) {
      callback({ ...this.state });
    }
  }

  /**
   * Log history of actions
   */
  private logHistory(action: string, status: string): void {
    this.state.history.push({
      timestamp: Date.now(),
      action,
      status,
    });
  }

  /**
   * Get current state
   */
  getState(): ActionExecutorState {
    return { ...this.state };
  }
}
