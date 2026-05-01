import { Check, Loader2, AlertCircle, Zap } from 'lucide-react';
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
            <label className="mb-1 block text-[11px] text-muted-foreground">
              API Key
            </label>
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              Base URL (optional)
            </label>
            <Input
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
          <label className="mb-1 block text-[11px] text-muted-foreground">
            OAuth Access Token
          </label>
          <Input
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
            <label className="mb-1 block text-[11px] text-muted-foreground">
              Region
            </label>
            <Input
              placeholder="us-east-1"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              Access Key ID
            </label>
            <Input
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
              validationStatus === 'valid' && 'bg-emerald-600 hover:bg-emerald-700',
            )}
            variant={validationStatus === 'valid' ? 'default' : 'secondary'}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Testing...
              </>
            ) : validationStatus === 'valid' ? (
              <>
                <Check className="h-3 w-3" />
                Connected
              </>
            ) : (
              <>
                <Zap className="h-3 w-3" />
                Test Model
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
