import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface MentionSuggestion {
  id: string;
  label: string;
  category: string;
  value: string;
}

interface MentionInputTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  contextData?: Record<string, any>;
}

export function MentionInputTextarea({
  value,
  onChange,
  placeholder = 'Type @ to mention...',
  className,
  contextData = {},
}: MentionInputTextareaProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Flatten context data into mention suggestions
  const flatContextData = useMemo(() => {
    const flat: Record<string, any> = {};

    // Set to keep track of visited objects to prevent circular reference issues
    const visited = new Set();

    const flatten = (obj: Record<string, any>, prefix: string = '', depth: number = 0) => {
      // Prevent infinite recursion with deeply nested objects
      if (depth > 10) return; // Limit nesting depth to prevent performance issues

      // Check if obj is an object and not already visited (to prevent circular references)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        if (visited.has(obj)) {
          return; // Skip circular references
        }
        visited.add(obj);
      }

      for (const [key, val] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        // Only flatten objects, not arrays or null values
        if (val && typeof val === 'object' && !Array.isArray(val) && val !== null) {
          if (!visited.has(val)) {
            flatten(val, fullKey, depth + 1);
          }
        } else {
          flat[fullKey] = val;
        }
      }
    };

    if (contextData && typeof contextData === 'object') {
      flatten(contextData);
    }
    return flat;
  }, [contextData]);

  // Generate suggestions based on context data
  const generateSuggestions = useCallback((query: string) => {
    const suggestions: MentionSuggestion[] = [];

    // Add user context suggestions
    if (contextData.user) {
      Object.entries(contextData.user).forEach(([key, val]) => {
        if (key.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            id: `user.${key}`,
            label: `user.${key}`,
            category: 'User',
            value: val,
          });
        }
      });
    }

    // Add business context suggestions
    if (contextData.business) {
      Object.entries(contextData.business).forEach(([key, val]) => {
        if (key.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            id: `business.${key}`,
            label: `business.${key}`,
            category: 'Business',
            value: val,
          });
        }
      });
    }

    // Add general context suggestions
    if (contextData.context) {
      Object.entries(contextData.context).forEach(([key, val]) => {
        if (key.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            id: `context.${key}`,
            label: `context.${key}`,
            category: 'Context',
            value: val,
          });
        }
      });
    }

    return suggestions;
  }, [contextData, flatContextData]);

  // Check if we should show suggestions based on input
  const checkForMentionTrigger = useCallback((input: string, selectionStart: number | null) => {
    if (selectionStart === null) return null;

    // Look for @ symbol at the start or after a space
    let i = selectionStart - 1;
    while (i >= 0 && input[i] !== ' ' && input[i] !== '\n' && input[i] !== '\t') {
      if (input[i] === '@') {
        const query = input.substring(i + 1, selectionStart);
        return query;
      }
      i--;
    }
    return null;
  }, []);

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value;
    setInputValue(newValue);
    onChange(newValue);

    const selectionStart = e.currentTarget.selectionStart;
    const query = checkForMentionTrigger(newValue, selectionStart);

    if (query !== null) {
      setShowSuggestions(true);
      const newSuggestions = generateSuggestions(query);
      setSuggestions(newSuggestions);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [checkForMentionTrigger, generateSuggestions, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (suggestions[activeSuggestionIndex]) {
        insertMention(suggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, activeSuggestionIndex]);

  const insertMention = useCallback((suggestion: MentionSuggestion) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart || 0;
    const textBefore = inputValue.substring(0, cursorPos);
    const textAfter = inputValue.substring(cursorPos);

    // Find the @ symbol and extract the query
    let i = cursorPos - 1;
    while (i >= 0 && textBefore[i] !== ' ' && textBefore[i] !== '\n' && textBefore[i] !== '\t') {
      if (textBefore[i] === '@') {
        break;
      }
      i--;
    }

    if (i >= 0) {
      const newText =
        textBefore.substring(0, i) +
        `@${suggestion.label}` +
        (textAfter.startsWith(' ') ? textAfter : ` ${textAfter}`);

      setInputValue(newText);
      onChange(newText);

      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = i + suggestion.label.length + 1;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);

      setShowSuggestions(false);
    }
  }, [inputValue, onChange]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current !== e.target
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update internal value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={inputValue}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {showSuggestions && suggestions.length > 0 && textareaRef.current && (
        createPortal(
          <div
            ref={suggestionsRef}
            className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1"
            style={{
              top: (textareaRef.current.getBoundingClientRect().bottom + window.scrollY) + 'px',
              left: (textareaRef.current.getBoundingClientRect().left + window.scrollX) + 'px',
              width: textareaRef.current.getBoundingClientRect().width + 'px',
            }}
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={`p-2 cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground ${
                  index === activeSuggestionIndex ? 'bg-accent text-accent-foreground' : ''
                }`}
                onClick={() => insertMention(suggestion)}
              >
                <div className="font-medium">{suggestion.label}</div>
                <div className="text-xs text-muted-foreground">{suggestion.category}: {String(suggestion.value)}</div>
              </div>
            ))}
          </div>,
          document.body
        )
      )}
    </div>
  );
}