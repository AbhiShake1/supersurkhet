export type AiCapabilityClass =
  | 'read_data'
  | 'write_data'
  | 'summarization'
  | 'automation'
  | 'integrations';

export interface CapabilityDisclosureItem {
  id: AiCapabilityClass;
  title: string;
  summary: string;
}

export interface CapabilityDisclosureResponse {
  summary: string;
  capabilities: CapabilityDisclosureItem[];
  deniedRequests: string[];
  policyNote: string;
}

const CAPABILITY_DISCLOSURE_ITEMS: Record<
  AiCapabilityClass,
  CapabilityDisclosureItem
> = {
  read_data: {
    id: 'read_data',
    title: 'Read business data',
    summary:
      'Can read permitted business records to answer questions and generate insights.',
  },
  write_data: {
    id: 'write_data',
    title: 'Mutate business data',
    summary:
      'Can perform approved updates only after permission gate checks for mutating actions.',
  },
  summarization: {
    id: 'summarization',
    title: 'Summarize context',
    summary:
      'Can summarize conversations, schema metadata, and operational context at a high level.',
  },
  automation: {
    id: 'automation',
    title: 'Suggest workflows',
    summary:
      'Can suggest workflow steps and draft plans based on available business context.',
  },
  integrations: {
    id: 'integrations',
    title: 'Use connected integrations',
    summary:
      'Can invoke connected integration capabilities through approved interfaces without exposing internals.',
  },
};

const SENSITIVE_REQUEST_KEYWORDS = [
  'secret',
  'token',
  'credential',
  'password',
  'raw payload',
  'internal prompt',
  'private key',
];

function isAiCapabilityClass(value: string): value is AiCapabilityClass {
  return value in CAPABILITY_DISCLOSURE_ITEMS;
}

function isSensitiveRequest(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return SENSITIVE_REQUEST_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
}

export function buildCapabilityDisclosure(
  input: { requestedClasses?: string[] } = {},
): CapabilityDisclosureResponse {
  const requested = input.requestedClasses ?? [];
  const normalizedRequested = requested.map((item) =>
    item.trim().toLowerCase(),
  );

  const capabilities: CapabilityDisclosureItem[] = [];
  const deniedRequests: string[] = [];

  for (const item of normalizedRequested) {
    if (!item) continue;
    if (isSensitiveRequest(item)) {
      deniedRequests.push(item);
      continue;
    }
    if (isAiCapabilityClass(item)) {
      capabilities.push(CAPABILITY_DISCLOSURE_ITEMS[item]);
      continue;
    }
    deniedRequests.push(item);
  }

  if (capabilities.length === 0) {
    capabilities.push(CAPABILITY_DISCLOSURE_ITEMS.read_data);
    capabilities.push(CAPABILITY_DISCLOSURE_ITEMS.write_data);
  }

  return {
    summary:
      'Capability disclosures are limited to high-level classes and never include sensitive internals.',
    capabilities,
    deniedRequests,
    policyNote:
      'Sensitive internals, raw payloads, and secrets are never disclosed through capability explanations.',
  };
}
