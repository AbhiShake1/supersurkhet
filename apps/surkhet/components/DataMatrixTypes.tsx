export interface DataMatrixAction {
  version: string;
  action:
    | 'wifi_connect'
    | 'profile_enrichment'
    | 'equipment_session'
    | 'restaurant_ordering'
    | 'product_interaction'
    | 'navigate'
    | 'form_request'
    | 'choice_selection'
    | 'notification'
    | 'equipment_control';
  wifi?: {
    ssid: string;
    password: string;
    security?: 'WPA2' | 'WPA3' | 'WEP' | 'open';
  };
  navigation?: {
    url: string;
    params?: Record<string, string | boolean | number>;
  };
  post_connect?: {
    notification: {
      title: string;
      message: string;
    };
  };
  checks?: Array<{
    field: string;
    required?: boolean;
    if_missing?: {
      type: 'form_request' | 'choice_selection';
      schema?: {
        title: string;
        fields?: Array<{
          name: string;
          type: string;
          required?: boolean;
          label: string;
        }>;
      };
      options?: Array<{
        value: string;
        label: string;
      }>;
      multiple?: boolean;
    };
  }>;
  on_complete?: {
    type: 'navigate' | 'notification';
    url?: string;
    message?: string;
  };
  equipment?: {
    id: string;
    type: string;
    location: string;
  };
  session?: {
    duration: number;
    max_duration?: number;
    extendable?: boolean;
  };
  user_validation?: {
    membership_required?: boolean;
    min_fitness_level?: string;
  };
  actions?: {
    on_start?: {
      type: 'equipment_control';
      command: 'activate';
      parameters?: Record<string, string>;
    };
    on_extend?: {
      type: 'confirm';
      message: string;
      actions?: {
        confirm: {
          type: 'equipment_control';
          command: 'extend_session';
          duration: number;
        };
      };
    };
    on_end?: {
      type: 'equipment_control';
      command: 'deactivate';
    };
  };
  restaurant?: {
    id: string;
    table: string;
  };
  flow?: {
    steps: Array<{
      step: number;
      type:
        | 'menu_display'
        | 'order_building'
        | 'order_confirmation'
        | 'payment_selection';
      categories?: string[];
      filters?: {
        dietary?: string;
        availability?: string;
      };
      features?: {
        customization?: boolean;
        special_requests?: boolean;
        combo_suggestions?: boolean;
      };
      validation?: {
        allergen_check?: boolean;
        preparation_time?: string;
      };
      options?: ('card' | 'mobile_payment' | 'cash')[];
      tip_suggestions?: number[];
    }>;
  };
  product?: {
    id: string;
    sku: string;
  };
  interactions?: {
    info?: {
      type: 'product_details';
      sections: string[];
    };
    demo?: {
      type: 'ar_experience';
      model: string;
      features: string[];
    };
    compare?: {
      type: 'product_comparison';
      related_products: string[];
    };
    purchase?: {
      type: 'quick_buy';
      options: {
        delivery: ('in_store' | 'home_delivery')[];
        payment: string[];
      };
    };
  };
}

export type QrRetryClass =
  | 'interactive_fast_fail'
  | 'device_bridge'
  | 'commit_background'
  | 'scheduled_batch';

export type QrLocationPolicyMode = 'disabled' | 'balanced' | 'precision';

export interface QrLocationPolicy {
  mode: QrLocationPolicyMode;
  sampleWindowMs: number;
  minSampleCount: number;
  minDwellMs: number;
  maxHorizontalAccuracyMeters: number;
  minConfidence: number;
  allowPartialExecution: boolean;
  maxSampleAgeMs: number;
}

export interface QrEngineRetryPolicy {
  maxAttempts: number;
  backoffMs?: number;
}

export type QrEngineNodeKind = 'action' | 'branch' | 'delay' | 'humanGate';

export interface QrEngineNode {
  nodeId: string;
  kind: QrEngineNodeKind;
  actionId?: string;
  input?: unknown;
  runIf?: unknown;
  retryClass?: QrRetryClass;
  retryPolicy?: QrEngineRetryPolicy;
  timeoutMs?: number;
  delayMs?: number;
  metadata?: Record<string, unknown>;
}

export interface QrEngineEdge {
  from: string;
  to: string;
  on?: 'success' | 'failure' | 'always';
  condition?: unknown;
}

export interface QrEngineDefinition {
  schemaVersion: string;
  engineId: string;
  engineVersion: string;
  businessId: string;
  title?: string;
  lane: 'deterministic';
  entryNodeId: string;
  defaultRetryClass: QrRetryClass;
  locationPolicy: QrLocationPolicy;
  nodes: QrEngineNode[];
  edges: QrEngineEdge[];
  metadata?: Record<string, unknown>;
}

export interface QrSignedRefTarget {
  businessId: string;
  engineId: string;
  engineVersion: string;
  definitionHash?: string;
}

export interface QrSignedRefPayload {
  tokenVersion: string;
  payloadVersion: string;
  lane: 'deterministic';
  issuedAt: number;
  expiresAt: number;
  notBefore?: number;
  nonce: string;
  reference: QrSignedRefTarget;
  locationPolicyOverride?: Partial<QrLocationPolicy>;
  metadata?: Record<string, unknown>;
}

export interface QrSignedRefToken {
  payload: QrSignedRefPayload;
  signature: string;
  signatureAlgorithm: 'HS256' | 'Ed25519';
  keyId?: string;
}
