import { AlertCircle, Check, Loader2, Zap } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AssistantAuthMode } from '@/lib/ai/business-onboarding-models';
import { cn } from '@/lib/utils';

interface ManualCredentialPanelProps {
  authMode: AssistantAuthMode;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  isTesting?: boolean;
  onTestModel?: () => Promise<void>;
  testResult?: string | null;
  validationStatus: 'idle' | 'validating' | 'valid' | 'invalid';
  validationError?: string;
}

const validationBadgeConfig = {
  idle: { icon: null, label: 'Not validated', tone: 'text-muted-foreground' },
  validating: {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    label: 'Validating...',
    tone: 'text-blue-500',
  },
  valid: {
    icon: <Check className="h-3 w-3 text-emerald-500" />,
    label: 'Valid',
    tone: 'text-emerald-600',
  },
  invalid: {
    icon: <AlertCircle className="h-3 w-3 text-red-500" />,
    label: 'Invalid',
    tone: 'text-red-600',
  },
};

interface TestButtonContentProps {
  isTesting: boolean;
  validationStatus: 'idle' | 'validating' | 'valid' | 'invalid';
}

/**
 * Renders the content of the Test Model button.
 * Uses early returns instead of nested ternary for readability.
 * Internal to ManualCredentialPanel — not exported.
 */
function TestButtonContent({
  isTesting,
  validationStatus,
}: TestButtonContentProps) {
  if (isTesting) {
    return (
      <>
        <Loader2 className="h-3 w-3 animate-spin" />
        Testing...
      </>
    );
  }

  if (validationStatus === 'valid') {
    return (
      <>
        <Check className="h-3 w-3" />
        Connected
      </>
    );
  }

  return (
    <>
      <Zap className="h-3 w-3" />
      Test Model
    </>
  );
}

export function ManualCredentialPanel({
  authMode,
  apiKey,
  onApiKeyChange,
  baseUrl,
  onBaseUrlChange,
  onSave,
  isSaving,
  isTesting = false,
  onTestModel,
  testResult,
  validationStatus,
  validationError,
}: ManualCredentialPanelProps) {
  const fieldId = useId();
  const apiKeyInputId = `${fieldId}-api-key`;
  const baseUrlInputId = `${fieldId}-base-url`;
  const oauthTokenInputId = `${fieldId}-oauth-token`;
  const awsRegionInputId = `${fieldId}-aws-region`;
  const awsAccessKeyInputId = `${fieldId}-aws-access-key`;
  const badge = validationBadgeConfig[validationStatus];

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-muted-foreground">Credential</span>
        <span className={cn('flex items-center gap-1', badge.tone)}>
          {badge.icon}
          {badge.label}
        </span>
      </div>

      {authMode === 'api-key' && (
        <div className="space-y-2">
          <div>
            <label
              htmlFor={apiKeyInputId}
              className="mb-1 block text-[11px] text-muted-foreground"
            >
              API Key
            </label>
            <Input
              id={apiKeyInputId}
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label
              htmlFor={baseUrlInputId}
              className="mb-1 block text-[11px] text-muted-foreground"
            >
              Base URL (optional)
            </label>
            <Input
              id={baseUrlInputId}
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {authMode === 'oauth-access-token' && (
        <div>
          <label
            htmlFor={oauthTokenInputId}
            className="mb-1 block text-[11px] text-muted-foreground"
          >
            OAuth Access Token
          </label>
          <Input
            id={oauthTokenInputId}
            type="password"
            placeholder="ya29...."
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      )}

      {authMode === 'aws-credential-chain' && (
        <div className="space-y-2">
          <div>
            <label
              htmlFor={awsRegionInputId}
              className="mb-1 block text-[11px] text-muted-foreground"
            >
              Region
            </label>
            <Input
              id={awsRegionInputId}
              placeholder="us-east-1"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label
              htmlFor={awsAccessKeyInputId}
              className="mb-1 block text-[11px] text-muted-foreground"
            >
              Access Key ID
            </label>
            <Input
              id={awsAccessKeyInputId}
              placeholder="AKIA..."
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {validationError && (
        <div className="flex items-start gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-600">
          <AlertCircle className="mt-px h-3 w-3 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {testResult && validationStatus === 'valid' && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px] text-emerald-600">
          Model response: {testResult}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={isSaving || isTesting}
          className="flex-1 h-7 text-xs"
          variant="outline"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
        {onTestModel && (
          <Button
            type="button"
            size="sm"
            onClick={onTestModel}
            disabled={isTesting || isSaving}
            className={cn(
              'flex-1 h-7 text-xs gap-1.5',
              validationStatus === 'valid' &&
                'bg-emerald-600 hover:bg-emerald-700',
            )}
            variant={validationStatus === 'valid' ? 'default' : 'secondary'}
          >
            <TestButtonContent
              isTesting={isTesting}
              validationStatus={validationStatus}
            />
          </Button>
        )}
      </div>
    </div>
  );
}
