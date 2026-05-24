export type AssistantAuthMode =
  | 'api-key'
  | 'oauth-access-token'
  | 'aws-credential-chain'
  | 'none';

export type BusinessOnboardingProviderId = string;

export interface BusinessOnboardingModelOption {
  id: string;
  label: string;
  provider: BusinessOnboardingProviderId;
  defaultAuthMode: AssistantAuthMode;
  description?: string;
}

export const BUSINESS_ONBOARDING_MODEL_OPTIONS: readonly BusinessOnboardingModelOption[] =
  [
    // Google Gemini models
    {
      id: 'gemini-2.5-flash',
      label: 'Gemini 2.5 Flash',
      provider: 'google',
      defaultAuthMode: 'api-key',
      description: 'Fast, cost-effective for most tasks.',
    },
    {
      id: 'gemini-2.5-pro',
      label: 'Gemini 2.5 Pro',
      provider: 'google',
      defaultAuthMode: 'api-key',
      description: 'Strong reasoning and complex tasks.',
    },
    {
      id: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      provider: 'google',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'gemini-2.0-flash-lite',
      label: 'Gemini 2.0 Flash Lite',
      provider: 'google',
      defaultAuthMode: 'api-key',
      description: 'Lightweight, lowest latency.',
    },
    {
      id: 'gemini-1.5-pro',
      label: 'Gemini 1.5 Pro',
      provider: 'google',
      defaultAuthMode: 'api-key',
      description: 'Large context window, complex reasoning.',
    },
    {
      id: 'gemini-1.5-flash',
      label: 'Gemini 1.5 Flash',
      provider: 'google',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'gpt-5-mini',
      label: 'GPT-5 Mini',
      provider: 'openai',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'claude-sonnet-4-5',
      label: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'openai/gpt-5',
      label: 'OpenRouter GPT-5',
      provider: 'openrouter',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'gpt-5.2-codex',
      label: 'OpenCode Zen GPT 5.2 Codex',
      provider: 'opencode',
      defaultAuthMode: 'api-key',
      description: 'Curated Codex route via OpenCode Zen.',
    },
    {
      id: 'claude-sonnet-4-5',
      label: 'OpenCode Zen Claude Sonnet 4.5',
      provider: 'opencode',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'gemini-3-pro',
      label: 'OpenCode Zen Gemini 3 Pro',
      provider: 'opencode',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'qwen3-coder',
      label: 'OpenCode Zen Qwen3 Coder 480B',
      provider: 'opencode',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'llama-3.3-70b-versatile',
      label: 'Groq Llama 3.3 70B',
      provider: 'groq',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'openai/gpt-oss-120b',
      label: 'Together GPT-OSS 120B',
      provider: 'together',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'deepseek-chat',
      label: 'DeepSeek Chat',
      provider: 'deepseek',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'grok-code-fast-1',
      label: 'xAI Grok Code Fast',
      provider: 'xai',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'mistral-large-latest',
      label: 'Mistral Large',
      provider: 'mistral',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'openai/gpt-5',
      label: 'Requesty GPT-5',
      provider: 'requesty',
      defaultAuthMode: 'api-key',
    },
    {
      id: 'qwen3-coder:30b',
      label: 'Ollama Qwen3 Coder 30B',
      provider: 'ollama',
      defaultAuthMode: 'none',
    },
    {
      id: 'openai/gpt-oss-20b',
      label: 'LM Studio GPT-OSS 20B',
      provider: 'lmstudio',
      defaultAuthMode: 'none',
    },
    {
      id: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      label: 'Bedrock Claude Sonnet 4',
      provider: 'bedrock',
      defaultAuthMode: 'aws-credential-chain',
    },
  ];

export const DEFAULT_BUSINESS_ONBOARDING_MODEL_ID = 'gemini-2.5-flash';

const MODELS_DEV_PROVIDER_IDS = [
  '302ai',
  'abacus',
  'aihubmix',
  'alibaba',
  'alibaba-cn',
  'amazon-bedrock',
  'anthropic',
  'azure',
  'azure-cognitive-services',
  'bailing',
  'baseten',
  'berget',
  'cerebras',
  'chutes',
  'cloudferro-sherlock',
  'cloudflare-ai-gateway',
  'cloudflare-workers-ai',
  'cohere',
  'cortecs',
  'deepinfra',
  'deepseek',
  'evroc',
  'fastrouter',
  'fireworks-ai',
  'firmware',
  'friendli',
  'github-copilot',
  'github-models',
  'gitlab',
  'google',
  'google-vertex',
  'google-vertex-anthropic',
  'groq',
  'helicone',
  'huggingface',
  'iflowcn',
  'inception',
  'inference',
  'io-net',
  'jiekou',
  'kilo',
  'kimi-for-coding',
  'kuae-cloud-coding-plan',
  'llama',
  'lmstudio',
  'lucidquery',
  'meganova',
  'minimax',
  'minimax-cn',
  'minimax-cn-coding-plan',
  'minimax-coding-plan',
  'mistral',
  'moark',
  'modelscope',
  'moonshotai',
  'moonshotai-cn',
  'morph',
  'nano-gpt',
  'nebius',
  'nova',
  'novita-ai',
  'nvidia',
  'ollama-cloud',
  'openai',
  'opencode',
  'openrouter',
  'ovhcloud',
  'perplexity',
  'poe',
  'privatemode-ai',
  'qihang-ai',
  'qiniu-ai',
  'requesty',
  'sap-ai-core',
  'scaleway',
  'siliconflow',
  'siliconflow-cn',
  'stackit',
  'stepfun',
  'submodel',
  'synthetic',
  'togetherai',
  'upstage',
  'v0',
  'venice',
  'vercel',
  'vivgrid',
  'vultr',
  'wandb',
  'xai',
  'xiaomi',
  'zai',
  'zai-coding-plan',
  'zenmux',
  'zhipuai',
  'zhipuai-coding-plan',
] as const;

const providerSupportedAuthModesSeed: Record<
  string,
  readonly AssistantAuthMode[]
> = Object.fromEntries(
  MODELS_DEV_PROVIDER_IDS.map((providerId) => [providerId, ['api-key']]),
);

export const PROVIDER_SUPPORTED_AUTH_MODES: Record<
  string,
  readonly AssistantAuthMode[]
> = {
  ...providerSupportedAuthModesSeed,
  openai: ['api-key', 'oauth-access-token'],
  anthropic: ['api-key', 'oauth-access-token'],
  google: ['api-key', 'oauth-access-token'],
  groq: ['api-key', 'oauth-access-token'],
  deepseek: ['api-key', 'oauth-access-token'],
  mistral: ['api-key', 'oauth-access-token'],
  requesty: ['api-key', 'oauth-access-token'],
  xai: ['api-key', 'oauth-access-token'],
  openrouter: ['api-key', 'oauth-access-token'],
  opencode: ['api-key', 'oauth-access-token'],
  gitlab: ['api-key', 'oauth-access-token'],
  'github-copilot': ['api-key', 'oauth-access-token'],
  'amazon-bedrock': ['aws-credential-chain', 'api-key'],
  bedrock: ['aws-credential-chain', 'api-key'],
  together: ['api-key', 'oauth-access-token'],
  ollama: ['none', 'api-key'],
  lmstudio: ['none', 'api-key'],
  'custom-openai-compatible': ['api-key', 'oauth-access-token'],
};

export const PROVIDER_DEFAULT_BASE_URL: Record<string, string> = {
  '302ai': 'https://api.302.ai/v1',
  abacus: 'https://routellm.abacus.ai/v1',
  aihubmix: 'https://aihubmix.com/v1',
  alibaba: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  'alibaba-cn': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  bailing: 'https://api.tbox.cn/api/llm/v1/chat/completions',
  baseten: 'https://inference.baseten.co/v1',
  berget: 'https://api.berget.ai/v1',
  chutes: 'https://llm.chutes.ai/v1',
  'cloudferro-sherlock': 'https://api-sherlock.cloudferro.com/openai/v1/',
  'cloudflare-workers-ai': `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID ?? ''}/ai/v1`,
  cortecs: 'https://api.cortecs.ai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  evroc: 'https://models.think.evroc.com/v1',
  fastrouter: 'https://go.fastrouter.ai/api/v1',
  'fireworks-ai': 'https://api.fireworks.ai/inference/v1/',
  firmware: 'https://app.firmware.ai/api/v1',
  friendli: 'https://api.friendli.ai/serverless/v1',
  'github-copilot': 'https://api.githubcopilot.com',
  'github-models': 'https://models.github.ai/inference',
  helicone: 'https://ai-gateway.helicone.ai/v1',
  huggingface: 'https://router.huggingface.co/v1',
  iflowcn: 'https://apis.iflow.cn/v1',
  inception: 'https://api.inceptionlabs.ai/v1/',
  inference: 'https://inference.net/v1',
  'io-net': 'https://api.intelligence.io.solutions/api/v1',
  jiekou: 'https://api.jiekou.ai/openai',
  kilo: 'https://api.kilo.ai/api/gateway',
  'kimi-for-coding': 'https://api.kimi.com/coding/v1',
  'kuae-cloud-coding-plan': 'https://coding-plan-endpoint.kuaecloud.net/v1',
  llama: 'https://api.llama.com/compat/v1/',
  lmstudio: 'http://127.0.0.1:1234/v1',
  lucidquery: 'https://lucidquery.com/api/v1',
  meganova: 'https://api.meganova.ai/v1',
  minimax: 'https://api.minimax.io/anthropic/v1',
  'minimax-cn': 'https://api.minimaxi.com/anthropic/v1',
  'minimax-cn-coding-plan': 'https://api.minimaxi.com/anthropic/v1',
  'minimax-coding-plan': 'https://api.minimax.io/anthropic/v1',
  moark: 'https://moark.com/v1',
  modelscope: 'https://api-inference.modelscope.cn/v1',
  moonshotai: 'https://api.moonshot.ai/v1',
  'moonshotai-cn': 'https://api.moonshot.cn/v1',
  morph: 'https://api.morphllm.com/v1',
  'nano-gpt': 'https://nano-gpt.com/api/v1',
  nebius: 'https://api.tokenfactory.nebius.com/v1',
  nova: 'https://api.nova.amazon.com/v1',
  'novita-ai': 'https://api.novita.ai/openai',
  nvidia: 'https://integrate.api.nvidia.com/v1',
  'ollama-cloud': 'https://ollama.com/v1',
  opencode: 'https://opencode.ai/zen/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ovhcloud: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
  poe: 'https://api.poe.com/v1',
  'privatemode-ai': 'http://localhost:8080/v1',
  'qihang-ai': 'https://api.qhaigc.net/v1',
  'qiniu-ai': 'https://api.qnaigc.com.com/v1',
  requesty: 'https://router.requesty.ai/v1',
  scaleway: 'https://api.scaleway.ai/v1',
  siliconflow: 'https://api.siliconflow.com/v1',
  'siliconflow-cn': 'https://api.siliconflow.cn/v1',
  stackit: 'https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1',
  stepfun: 'https://api.stepfun.com/v1',
  submodel: 'https://llm.submodel.ai/v1',
  synthetic: 'https://api.synthetic.new/v1',
  upstage: 'https://api.upstage.ai/v1/solar',
  vivgrid: 'https://api.vivgrid.com/v1',
  vultr: 'https://api.vultrinference.com/v1',
  wandb: 'https://api.inference.wandb.ai/v1',
  xiaomi: 'https://api.xiaomimimo.com/v1',
  zai: 'https://api.z.ai/api/paas/v4',
  'zai-coding-plan': 'https://api.z.ai/api/coding/paas/v4',
  zenmux: 'https://zenmux.ai/api/anthropic/v1',
  zhipuai: 'https://open.bigmodel.cn/api/paas/v4',
  'zhipuai-coding-plan': 'https://open.bigmodel.cn/api/coding/paas/v4',
  groq: 'https://api.groq.com/openai/v1',
  together: 'https://api.together.xyz/v1',
  togetherai: 'https://api.together.xyz/v1',
  xai: 'https://api.x.ai/v1',
  mistral: 'https://api.mistral.ai/v1',
  ollama: 'http://127.0.0.1:11434/v1',
  'custom-openai-compatible': process.env.OPENAI_COMPATIBLE_BASE_URL ?? '',
};

export const PROVIDER_ENV_API_KEYS: Record<string, readonly string[]> = {
  '302ai': ['302AI_API_KEY'],
  abacus: ['ABACUS_API_KEY'],
  aihubmix: ['AIHUBMIX_API_KEY'],
  alibaba: ['DASHSCOPE_API_KEY'],
  'alibaba-cn': ['DASHSCOPE_API_KEY'],
  'amazon-bedrock': [
    'AWS_BEARER_TOKEN_BEDROCK',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
  ],
  bedrock: [
    'AWS_BEARER_TOKEN_BEDROCK',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
  ],
  anthropic: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'],
  azure: ['AZURE_RESOURCE_NAME', 'AZURE_API_KEY'],
  'azure-cognitive-services': [
    'AZURE_COGNITIVE_SERVICES_RESOURCE_NAME',
    'AZURE_COGNITIVE_SERVICES_API_KEY',
  ],
  bailing: ['BAILING_API_TOKEN'],
  baseten: ['BASETEN_API_KEY'],
  berget: ['BERGET_API_KEY'],
  cerebras: ['CEREBRAS_API_KEY'],
  chutes: ['CHUTES_API_KEY'],
  'cloudferro-sherlock': ['CLOUDFERRO_SHERLOCK_API_KEY'],
  'cloudflare-ai-gateway': [
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_GATEWAY_ID',
  ],
  'cloudflare-workers-ai': ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_KEY'],
  cohere: ['COHERE_API_KEY'],
  cortecs: ['CORTECS_API_KEY'],
  deepinfra: ['DEEPINFRA_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  evroc: ['EVROC_API_KEY'],
  fastrouter: ['FASTROUTER_API_KEY'],
  'fireworks-ai': ['FIREWORKS_API_KEY'],
  firmware: ['FIRMWARE_API_KEY'],
  friendli: ['FRIENDLI_TOKEN'],
  'github-copilot': ['GITHUB_TOKEN'],
  'github-models': ['GITHUB_TOKEN'],
  gitlab: ['GITLAB_TOKEN'],
  google: ['GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_API_KEY'],
  'google-vertex': [
    'GOOGLE_VERTEX_PROJECT',
    'GOOGLE_VERTEX_LOCATION',
    'GOOGLE_APPLICATION_CREDENTIALS',
  ],
  'google-vertex-anthropic': [
    'GOOGLE_VERTEX_PROJECT',
    'GOOGLE_VERTEX_LOCATION',
    'GOOGLE_APPLICATION_CREDENTIALS',
  ],
  groq: ['GROQ_API_KEY'],
  helicone: ['HELICONE_API_KEY'],
  huggingface: ['HF_TOKEN'],
  iflowcn: ['IFLOW_API_KEY'],
  inception: ['INCEPTION_API_KEY'],
  inference: ['INFERENCE_API_KEY'],
  'io-net': ['IOINTELLIGENCE_API_KEY'],
  jiekou: ['JIEKOU_API_KEY'],
  kilo: ['KILO_API_KEY'],
  'kimi-for-coding': ['KIMI_API_KEY'],
  'kuae-cloud-coding-plan': ['KUAE_API_KEY'],
  llama: ['LLAMA_API_KEY'],
  lmstudio: ['LMSTUDIO_API_KEY'],
  lucidquery: ['LUCIDQUERY_API_KEY'],
  meganova: ['MEGANOVA_API_KEY'],
  minimax: ['MINIMAX_API_KEY'],
  'minimax-cn': ['MINIMAX_API_KEY'],
  'minimax-cn-coding-plan': ['MINIMAX_API_KEY'],
  'minimax-coding-plan': ['MINIMAX_API_KEY'],
  mistral: ['MISTRAL_API_KEY'],
  moark: ['MOARK_API_KEY'],
  modelscope: ['MODELSCOPE_API_KEY'],
  moonshotai: ['MOONSHOT_API_KEY'],
  'moonshotai-cn': ['MOONSHOT_API_KEY'],
  morph: ['MORPH_API_KEY'],
  'nano-gpt': ['NANO_GPT_API_KEY'],
  nebius: ['NEBIUS_API_KEY'],
  nova: ['NOVA_API_KEY'],
  'novita-ai': ['NOVITA_API_KEY'],
  nvidia: ['NVIDIA_API_KEY'],
  'ollama-cloud': ['OLLAMA_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  opencode: ['OPENCODE_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  ovhcloud: ['OVHCLOUD_API_KEY'],
  perplexity: ['PERPLEXITY_API_KEY'],
  poe: ['POE_API_KEY'],
  'privatemode-ai': ['PRIVATEMODE_API_KEY', 'PRIVATEMODE_ENDPOINT'],
  'qihang-ai': ['QIHANG_API_KEY'],
  'qiniu-ai': ['Qiniu_API_KEY'],
  requesty: ['REQUESTY_API_KEY'],
  'sap-ai-core': ['AICORE_SERVICE_KEY'],
  scaleway: ['SCALEWAY_API_KEY'],
  siliconflow: ['SILICONFLOW_API_KEY'],
  'siliconflow-cn': ['SILICONFLOW_CN_API_KEY'],
  stackit: ['STACKIT_API_KEY'],
  stepfun: ['STEPFUN_API_KEY'],
  submodel: ['SUBMODEL_INSTAGEN_ACCESS_KEY'],
  synthetic: ['SYNTHETIC_API_KEY'],
  together: ['TOGETHER_API_KEY'],
  togetherai: ['TOGETHER_API_KEY'],
  upstage: ['UPSTAGE_API_KEY'],
  v0: ['V0_API_KEY'],
  venice: ['VENICE_API_KEY'],
  vercel: ['AI_GATEWAY_API_KEY'],
  vivgrid: ['VIVGRID_API_KEY'],
  vultr: ['VULTR_API_KEY'],
  wandb: ['WANDB_API_KEY'],
  xai: ['XAI_API_KEY'],
  xiaomi: ['XIAOMI_API_KEY'],
  zai: ['ZHIPU_API_KEY'],
  'zai-coding-plan': ['ZHIPU_API_KEY'],
  zenmux: ['ZENMUX_API_KEY'],
  zhipuai: ['ZHIPU_API_KEY'],
  'zhipuai-coding-plan': ['ZHIPU_API_KEY'],
  ollama: [],
  'custom-openai-compatible': ['OPENAI_COMPATIBLE_API_KEY'],
};

export function resolveAssistantModelOption(
  modelId?: string,
): BusinessOnboardingModelOption {
  if (!modelId || modelId.trim().length === 0) {
    return (
      BUSINESS_ONBOARDING_MODEL_OPTIONS.find(
        (option) => option.id === DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
      ) ?? BUSINESS_ONBOARDING_MODEL_OPTIONS[0]
    );
  }

  return (
    BUSINESS_ONBOARDING_MODEL_OPTIONS.find((option) => option.id === modelId) ??
    BUSINESS_ONBOARDING_MODEL_OPTIONS.find(
      (option) => option.id === DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
    ) ??
    BUSINESS_ONBOARDING_MODEL_OPTIONS[0]
  );
}

export function resolveProviderSupportedAuthModes(
  provider: BusinessOnboardingProviderId,
): readonly AssistantAuthMode[] {
  return PROVIDER_SUPPORTED_AUTH_MODES[provider] ?? ['api-key'];
}

export function resolveProviderDefaultAuthMode(
  provider: BusinessOnboardingProviderId,
): AssistantAuthMode {
  const modes = resolveProviderSupportedAuthModes(provider);
  return modes[0] ?? 'api-key';
}

export function resolveProviderDefaultBaseUrl(
  provider: BusinessOnboardingProviderId,
): string | undefined {
  const raw = PROVIDER_DEFAULT_BASE_URL[provider];
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveProviderApiKeyFromEnv(
  provider: BusinessOnboardingProviderId,
): string | undefined {
  const candidates = PROVIDER_ENV_API_KEYS[provider] ?? [];
  for (const envKey of candidates) {
    const value = process.env[envKey];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}
