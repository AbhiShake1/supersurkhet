'use client';

import { ArrowUpIcon, Bot, User } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

type VercelV0ChatWizardOption = {
  id: string;
  label: string;
  selected?: boolean;
  recommended?: boolean;
};

export type VercelV0ChatWizardInput = {
  value: string;
  placeholder: string;
  submitLabel?: string;
  maskedEchoLabel?: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

type VercelV0ChatWizard = {
  stageKey: string;
  prioritizeRecommended?: boolean;
  prompt?: string;
  options?: VercelV0ChatWizardOption[];
  onSelectOption?: (id: string) => void;
  input?: VercelV0ChatWizardInput;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  backLabel?: string;
  forwardLabel?: string;
  forwardEchoLabel?: string;
};

interface VercelV0ChatProps {
  fitContainer?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  wizard?: VercelV0ChatWizard;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const disconnectResizeObserver = useCallback(() => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
  }, []);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;

      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY),
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      disconnectResizeObserver();
      textareaRef.current = node;
      if (!node) return;

      node.style.height = `${minHeight}px`;
      adjustHeight();

      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => {
          adjustHeight();
        });
        observer.observe(node);
        resizeObserverRef.current = observer;
      }
    },
    [adjustHeight, disconnectResizeObserver, minHeight],
  );

  return { textareaRef: setTextareaRef, adjustHeight };
}

export function VercelV0Chat({
  fitContainer = false,
  className,
  title,
  subtitle,
}: VercelV0ChatProps) {
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hi there! I'm your AI assistant. Tell me about your business so I can recommend the best plugins for you.",
      timestamp: Date.now(),
    },
  ]);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  const appendMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => [...prev, message]);
      window.requestAnimationFrame(scrollToBottom);
    },
    [scrollToBottom],
  );

  const handleSendMessage = () => {
    if (!value.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: value.trim(),
      timestamp: Date.now(),
    };

    appendMessage(newUserMessage);
    setValue('');
    adjustHeight(true);

    // Mock assistant response
    setTimeout(() => {
      const assistantResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "That sounds interesting! Based on what you've shared, I'd recommend looking into our Inventory and Analytics plugins. Would you like to see how they can help?",
        timestamp: Date.now(),
      };
      appendMessage(assistantResponse);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={cn(
        'flex w-full flex-col overflow-hidden border border-white/10 bg-black/5 backdrop-blur-sm',
        fitContainer
          ? 'h-full max-w-none rounded-xl'
          : 'mx-auto h-[600px] max-w-4xl rounded-2xl',
        className,
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between border-b border-white/10 bg-black/20',
          fitContainer ? 'px-4 py-3' : 'px-6 py-4',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {title ?? 'Business Assistant'}
            </h2>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
              {subtitle ??
                'Explain your business needs to get personalized plugin recommendations. (Powered by AI)'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        ref={messagesContainerRef}
        className={cn(
          'scrollbar-hide flex-1 overflow-y-auto',
          fitContainer ? 'space-y-4 p-4' : 'space-y-6 p-6',
        )}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex w-full items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border',
                msg.role === 'assistant'
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-white/5 border-white/10 text-white',
              )}
            >
              {msg.role === 'assistant' ? (
                <Bot className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                msg.role === 'assistant'
                  ? 'bg-white/5 text-white border border-white/10 rounded-tl-none'
                  : 'bg-primary text-black font-medium rounded-tr-none',
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div
        className={cn(
          'border-t border-white/10 bg-black/20',
          fitContainer ? 'p-3' : 'p-4',
        )}
      >
        <div className="relative bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl">
          <div className="overflow-y-auto">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tell me about your business..."
              className={cn(
                'w-full px-4 py-3 pr-14 pb-10',
                'resize-none',
                'bg-transparent',
                'border-none',
                'text-white text-sm',
                'focus:outline-none',
                'focus-visible:ring-0 focus-visible:ring-offset-0',
                'placeholder:text-neutral-500',
                'min-h-[60px]',
              )}
              style={{
                overflow: 'hidden',
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleSendMessage}
            className={cn(
              'absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-95',
              value.trim()
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'bg-neutral-800 text-zinc-500 cursor-not-allowed',
            )}
            disabled={!value.trim()}
            aria-label="Send message"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
