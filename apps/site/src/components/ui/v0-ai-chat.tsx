"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ArrowUpIcon,
    Bot,
    User,
    Check,
} from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

interface VercelV0ChatProps {
    fitContainer?: boolean;
    className?: string;
    title?: string;
    subtitle?: string;
    wizard?: {
        stageKey: string;
        prompt: string;
        prioritizeRecommended?: boolean;
        options?: Array<{
            id: string;
            label: string;
            selected?: boolean;
            recommended?: boolean;
            showCheckmark?: boolean;
        }>;
        onSelectOption?: (id: string) => void;
        input?: {
            value: string;
            placeholder: string;
            submitLabel?: string;
            maskedEchoLabel?: string;
            onChange: (value: string) => void;
            onSubmit: () => void;
        };
        canGoBack?: boolean;
        onBack?: () => void;
        backLabel?: string;
        canGoForward?: boolean;
        onForward?: () => void;
        forwardLabel?: string;
        forwardEchoLabel?: string;
    };
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

export function VercelV0Chat({
    fitContainer = false,
    className,
    title = "Business Assistant",
    subtitle = "Explain your business needs to get personalized plugin recommendations.(Powered by AI)",
    wizard,
}: VercelV0ChatProps) {
    const [value, setValue] = useState("");
    const [wizardSearch, setWizardSearch] = useState("");
    const [lastWizardPromptKey, setLastWizardPromptKey] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>(
        wizard
            ? []
            : [
                {
                    id: "1",
                    role: "assistant",
                    content: "Hi there! I'm your AI assistant. Tell me about your business so I can recommend the best plugins for you.",
                    timestamp: Date.now(),
                },
            ]
    );
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });

    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!wizard) return;
        const promptKey = `${wizard.stageKey}:${wizard.prompt}`;
        if (lastWizardPromptKey === promptKey) return;
        setMessages((prev) => [
            ...(prev.length > 0 &&
                prev[prev.length - 1]?.role === "assistant" &&
                prev[prev.length - 1]?.content === wizard.prompt
                ? prev
                : [
                    ...prev,
                    {
                        id: `${Date.now()}-assistant`,
                        role: "assistant",
                        content: wizard.prompt,
                        timestamp: Date.now(),
                    },
                ]),
        ]);
        setLastWizardPromptKey(promptKey);
    }, [wizard, lastWizardPromptKey]);

    useEffect(() => {
        setWizardSearch("");
    }, [wizard?.stageKey]);

    const handleWizardOptionSelect = (option: { id: string; label: string; showCheckmark?: boolean }) => {
        if (option.showCheckmark) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-assistant-selected`,
                    role: "assistant",
                    content: "Already selected.",
                    timestamp: Date.now(),
                },
            ]);
            return;
        }
        setMessages((prev) => [
            ...prev,
            {
                id: `${Date.now()}-user-option`,
                role: "user",
                content: option.label,
                timestamp: Date.now(),
            },
        ]);
        wizard?.onSelectOption?.(option.id);
    };

    const handleWizardInputSubmit = () => {
        if (!wizard?.input) return;
        if (!wizard.input.value.trim()) return;
        setMessages((prev) => [
            ...prev,
            {
                id: `${Date.now()}-user-input`,
                role: "user",
                content: wizard.input?.maskedEchoLabel ?? "Credential provided",
                timestamp: Date.now(),
            },
        ]);
        wizard.input.onSubmit();
    };

    const handleWizardForward = () => {
        if (!wizard?.onForward) return;
        if (!wizard.canGoForward) return;
        if (wizard.forwardEchoLabel?.trim()) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-user-forward`,
                    role: "user",
                    content: wizard.forwardEchoLabel!,
                    timestamp: Date.now(),
                },
            ]);
        }
        wizard.onForward();
    };

    const wizardOptions = wizard?.options ?? [];
    const normalizedWizardSearch = wizardSearch.trim().toLowerCase();
    const filteredWizardOptions = wizardOptions.filter((option) => {
        if (!normalizedWizardSearch) return true;
        return option.label.toLowerCase().includes(normalizedWizardSearch);
    });
    const orderedWizardOptions = (() => {
        if (!wizard?.prioritizeRecommended) {
            return filteredWizardOptions;
        }
        const recommended = filteredWizardOptions.filter((option) => option.recommended);
        const nonRecommended = filteredWizardOptions.filter((option) => !option.recommended);
        return [...recommended, ...nonRecommended];
    })();

    const handleSendMessage = () => {
        if (!value.trim()) return;

        const newUserMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: value.trim(),
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, newUserMessage]);
        setValue("");
        adjustHeight(true);

        // Mock assistant response
        setTimeout(() => {
            const assistantResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "That sounds interesting! Based on what you've shared, I'd recommend looking into our Inventory and Analytics plugins. Would you like to see how they can help?",
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantResponse]);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div
            className={cn(
                "flex w-full flex-col overflow-hidden border border-white/10 bg-[#0c0d10] backdrop-blur-sm",
                fitContainer
                    ? "h-full max-w-none rounded-xl"
                    : "mx-auto h-[600px] max-w-4xl rounded-2xl",
                className
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    "flex items-center justify-between border-b border-white/10 bg-black/30",
                    fitContainer ? "px-4 py-3" : "px-6 py-4"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{subtitle}</p>
                    </div>
                </div>
            </div>

            {/* Chat Messages */}
            <div
                ref={messagesContainerRef}
                className={cn(
                    "scrollbar-hide flex-1 overflow-y-auto",
                    fitContainer ? "space-y-3 p-4" : "space-y-5 p-6"
                )}
            >
                {wizard ? (
                    <div className="space-y-2 text-sm leading-relaxed">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "animate-in fade-in slide-in-from-bottom-1 duration-200",
                                    msg.role === "assistant" ? "text-left" : "text-right"
                                )}
                            >
                                <p
                                    className={cn(
                                        "inline-block max-w-[88%] rounded-lg px-2.5 py-1.5",
                                        msg.role === "assistant"
                                            ? "bg-white/5 text-zinc-300"
                                            : "bg-primary/20 text-zinc-100"
                                    )}
                                >
                                    {msg.content}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                                    msg.role === "assistant"
                                        ? "bg-primary/10 border-primary/20 text-primary"
                                        : "bg-white/5 border-white/10 text-white"
                                )}>
                                    {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                </div>
                                <div className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                                    msg.role === "assistant"
                                        ? "bg-white/5 text-white border border-white/10 rounded-tl-none"
                                        : "bg-primary text-black font-medium rounded-tr-none"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Input Area */}
            <div
                className={cn(
                    "border-t border-white/10 bg-black/20",
                    fitContainer ? "p-3" : "p-4"
                )}
            >
                {wizard ? (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-3">
                        {wizardOptions.length > 0 ? (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                                        Options
                                    </p>
                                    <div className="rounded-lg border border-white/10 bg-black/20">
                                    <div className="max-h-[8.75rem] overflow-y-auto p-2">
                                        <div className="space-y-1">
                                                {orderedWizardOptions.map((option, index) => (
                                                    <button
                                                        key={`option-${option.id}`}
                                                        type="button"
                                                        onClick={() => handleWizardOptionSelect(option)}
                                                        className={cn(
                                                            "flex min-h-11 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                                            option.selected
                                                                ? "border-primary/60 bg-primary/20 text-zinc-100"
                                                                : option.recommended
                                                                  ? "border-primary/30 bg-primary/10 text-zinc-100"
                                                                  : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10",
                                                        )}
                                                    >
                                                        <span>{index + 1}. {option.label}</span>
                                                        {option.showCheckmark ? (
                                                            <Check className="h-4 w-4 text-primary" />
                                                        ) : option.recommended ? (
                                                            <span className="text-zinc-500">Recommended</span>
                                                        ) : null}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="border-t border-white/10 p-2">
                                            <input
                                                type="text"
                                                value={wizardSearch}
                                                onChange={(event) => setWizardSearch(event.target.value)}
                                                placeholder="Search options..."
                                                className="h-9 w-full rounded-md border border-white/15 bg-black/40 px-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {wizard.input ? (
                            <div className="relative bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl">
                                <div className="overflow-y-auto">
                                    <Textarea
                                        ref={textareaRef}
                                        value={wizard.input.value}
                                        onChange={(e) => {
                                            wizard.input?.onChange(e.target.value);
                                            adjustHeight();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleWizardInputSubmit();
                                            }
                                        }}
                                        placeholder={wizard.input.placeholder}
                                        className={cn(
                                            "w-full px-4 py-3 pr-14 pb-10",
                                            "resize-none",
                                            "bg-transparent",
                                            "border-none",
                                            "text-white text-sm",
                                            "focus:outline-none",
                                            "focus-visible:ring-0 focus-visible:ring-offset-0",
                                            "placeholder:text-neutral-500",
                                            "min-h-[60px]"
                                        )}
                                        style={{
                                            overflow: "hidden",
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleWizardInputSubmit}
                                    className={cn(
                                        "absolute bottom-3 right-3 flex h-8 items-center justify-center rounded-full px-3 text-xs transition-all active:scale-95",
                                        wizard.input.value.trim()
                                            ? "bg-primary text-black hover:bg-primary/90"
                                            : "bg-neutral-800 text-zinc-500 cursor-not-allowed"
                                    )}
                                    disabled={!wizard.input.value.trim()}
                                    aria-label={wizard.input.submitLabel ?? "Submit"}
                                >
                                    {wizard.input.submitLabel ?? "Submit"}
                                </button>
                            </div>
                        ) : null}

                        {wizard.onBack || wizard.onForward ? (
                            <div className="flex items-center gap-2">
                                {wizard.onBack ? (
                                    <button
                                        type="button"
                                        onClick={wizard.onBack}
                                        disabled={!wizard.canGoBack}
                                        className={cn(
                                            "rounded-md border px-2.5 py-1 text-xs",
                                            wizard.canGoBack
                                                ? "border-white/20 text-zinc-300 hover:bg-white/5"
                                                : "cursor-not-allowed border-white/10 text-zinc-600"
                                        )}
                                    >
                                        {wizard.backLabel ?? "Back"}
                                    </button>
                                ) : null}
                                {wizard.onForward ? (
                                    <button
                                        type="button"
                                        onClick={handleWizardForward}
                                        disabled={!wizard.canGoForward}
                                        className={cn(
                                            "ml-auto rounded-md border px-2.5 py-1 text-xs",
                                            wizard.canGoForward
                                                ? "border-primary/40 bg-primary/20 text-zinc-100 hover:bg-primary/30"
                                                : "cursor-not-allowed border-white/10 text-zinc-600"
                                        )}
                                    >
                                        {wizard.forwardLabel ?? "Forward"}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : (
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
                                    "w-full px-4 py-3 pr-14 pb-10",
                                    "resize-none",
                                    "bg-transparent",
                                    "border-none",
                                    "text-white text-sm",
                                    "focus:outline-none",
                                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                                    "placeholder:text-neutral-500",
                                    "min-h-[60px]"
                                )}
                                style={{
                                    overflow: "hidden",
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSendMessage}
                            className={cn(
                                "absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-95",
                                value.trim()
                                    ? "bg-primary text-black hover:bg-primary/90"
                                    : "bg-neutral-800 text-zinc-500 cursor-not-allowed"
                            )}
                            disabled={!value.trim()}
                            aria-label="Send message"
                        >
                            <ArrowUpIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
