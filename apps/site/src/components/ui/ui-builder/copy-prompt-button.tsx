import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ClipboardCopy, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

interface CopyPromptButtonProps {
  onGeneratePrompt: () => string;
}

export const CopyPromptButton = ({ onGeneratePrompt }: CopyPromptButtonProps) => {
  const [buttonState, setButtonState] = useState<'idle' | 'success'>('idle');

  const copyMutation = useMutation({
    mutationFn: async () => {
      const promptText = onGeneratePrompt();
      try {
        // Modern clipboard API
        await navigator.clipboard.writeText(promptText);
        return { success: true };
      } catch (err) {
        // Fallback for older browsers or when clipboard permissions are denied
        const textArea = document.createElement('textarea');
        textArea.value = promptText;
        // Avoid scrolling to bottom
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        textArea.style.zIndex = '-1000';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (!successful) {
            throw new Error('Failed to copy text');
          }
        } finally {
          document.body.removeChild(textArea);
        }

        return { success: true };
      }
    },
    onSuccess: () => {
      setButtonState('success');
    },
    onError: (error) => {
      console.error('Failed to copy prompt:', error);
      // Optionally show an error toast here if needed
    },
  });

  // Reset button state after success
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (buttonState === 'success') {
      timer = setTimeout(() => {
        setButtonState('idle');
      }, 2000); // Reset after 2 seconds
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [buttonState]);

  const handleClick = useCallback(() => {
    copyMutation.mutate();
  }, [copyMutation]);

  // Determine the icon based on current state
  const getIcon = () => {
    if (copyMutation.isPending) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (buttonState === 'success') {
      return <Check className="h-4 w-4" />;
    }
    return <ClipboardCopy className="h-4 w-4" />;
  };

  // Determine button variant based on state
  const getVariant = () => {
    if (copyMutation.isPending) {
      return 'secondary';
    }
    if (buttonState === 'success') {
      return 'secondary';
    }
    return 'outline';
  };

  // Determine button text based on state
  const getText = () => {
    if (copyMutation.isPending) {
      return 'Copying...';
    }
    if (buttonState === 'success') {
      return 'Copied!';
    }
    return 'Copy AI Prompt';
  };

  return (
    <Button
      variant={getVariant()}
      size="sm"
      onClick={handleClick}
      disabled={copyMutation.isPending}
      className="min-w-[100px]"
      aria-label={buttonState === 'success' ? 'Copied!' : 'Copy AI Prompt'}
    >
      {getIcon()}
      <span className="ml-2 hidden sm:inline-block">{getText()}</span>
    </Button>
  );
};