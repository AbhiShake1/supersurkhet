'use client';

import { Input } from '@/components/ui/input';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface MentionSuggestion {
  id: string;
  label: string;
  category: string;
  value: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  contextData?: Record<string, any>;
}

export function MentionInput({
  value,
  onChange,
  placeholder = 'Type @ to mention...',
  className,
  contextData = {},
}: MentionInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Flatten context data into mention suggestions
  const flatContextData = useMemo(() => {
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    const flat: Record<string, any> = {};

    // Set to keep track of visited objects to prevent circular reference issues
    const visited = new Set();

    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    const flatten = (obj: Record<string, any>, prefix = '', depth = 0) => {
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
        if (
          val &&
          typeof val === 'object' &&
          !Array.isArray(val) &&
          val !== null
        ) {
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

  // Generate suggestions based on context data with fuzzy matching and ranking
  const generateSuggestions = useCallback(
    (query: string) => {
      if (!query) {
        // If no query, return first 5 top-level suggestions
        const allSuggestions: MentionSuggestion[] = [];

        if (contextData.context) {
          Object.entries(contextData.context)
            .slice(0, 5)
            .forEach(([key, val]) => {
              if (typeof val !== 'function')
                allSuggestions.push({
                  id: `context.${key}`,
                  label: `context.${key}`,
                  category: 'Context',
                  value: val,
                });
            });
        }

        return allSuggestions;
      }

      const allSuggestions: MentionSuggestion[] = [];

      // Add suggestions from flattened context data to support deep nesting
      Object.entries(flatContextData).forEach(([key, val]) => {
        // Extract the first part of the key to determine category
        const firstPart = key.split('.')[0];
        const category = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);

        if (typeof val !== 'function')
          allSuggestions.push({
            id: key,
            label: key,
            category,
            value: val,
          });
      });

      // Filter and rank the suggestions based on the query
      return allSuggestions
        .filter(
          (suggestion) =>
            // Check if the query matches the label (case-insensitive)
            suggestion.label.toLowerCase().includes(query.toLowerCase()) ||
            // Fuzzy matching: check if characters in query appear in sequence in label
            fuzzyMatch(suggestion.label.toLowerCase(), query.toLowerCase()),
        )
        .sort((a, b) => {
          // Ranking algorithm:
          // 1. Exact prefix matches first (query matches start of label)
          const aStartsWith = a.label
            .toLowerCase()
            .startsWith(query.toLowerCase());
          const bStartsWith = b.label
            .toLowerCase()
            .startsWith(query.toLowerCase());

          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;

          // 2. If both start with the query, sort by length (shorter is better)
          if (aStartsWith && bStartsWith) {
            return a.label.length - b.label.length;
          }

          // 3. Check for fuzzy match score
          const aFuzzyScore = fuzzyMatch(
            a.label.toLowerCase(),
            query.toLowerCase(),
          )
            ? fuzzyMatchScore(a.label.toLowerCase(), query.toLowerCase())
            : 0;
          const bFuzzyScore = fuzzyMatch(
            b.label.toLowerCase(),
            query.toLowerCase(),
          )
            ? fuzzyMatchScore(b.label.toLowerCase(), query.toLowerCase())
            : 0;

          if (aFuzzyScore !== bFuzzyScore) {
            return bFuzzyScore - aFuzzyScore; // Higher score first
          }

          // 4. If all else is equal, sort alphabetically
          return a.label.localeCompare(b.label);
        })
        .slice(0, 10); // Return top 10 matches
    },
    // biome-ignore lint/correctness/noInvalidUseBeforeDeclaration: lint debt cleanup
    // biome-ignore lint/correctness/useExhaustiveDependencies: lint debt cleanup
        [contextData, flatContextData, fuzzyMatch, fuzzyMatchScore],
  );

  // Fuzzy matching function
  const fuzzyMatch = (str: string, query: string): boolean => {
    let strIndex = 0;
    let queryIndex = 0;

    while (strIndex < str.length && queryIndex < query.length) {
      if (str[strIndex] === query[queryIndex]) {
        queryIndex++;
      }
      strIndex++;
    }

    return queryIndex === query.length;
  };

  // Fuzzy matching scoring function
  const fuzzyMatchScore = (str: string, query: string): number => {
    let score = 0;
    let strIndex = 0;
    let queryIndex = 0;
    let lastMatchIndex = -1;

    // Count matches and score based on how close the matches are
    while (strIndex < str.length && queryIndex < query.length) {
      if (str[strIndex] === query[queryIndex]) {
        // Add points for matching
        score += 1;

        // Bonus for consecutive matches
        if (lastMatchIndex === strIndex - 1) {
          score += 2;
        } else {
          // Penalty for gaps between matches
          score -= (strIndex - lastMatchIndex - 1) * 0.1;
        }

        lastMatchIndex = strIndex;
        queryIndex++;
      }
      strIndex++;
    }

    // Bonus for matches at the beginning of words (after spaces, periods, etc.)
    for (let i = 0; i < query.length; i++) {
      const charIndexInStr = str.indexOf(query[i]);
      if (
        charIndexInStr === 0 ||
        (charIndexInStr > 0 && /[\s._-]/.test(str[charIndexInStr - 1]))
      ) {
        score += 0.5;
      }
    }

    return score;
  };

  // Check if we should show suggestions based on input
  const checkForMentionTrigger = useCallback(
    (input: string, selectionStart: number | null) => {
      if (selectionStart === null) return null;

      // Look for @ symbol at the start or after a space
      let i = selectionStart - 1;
      while (i >= 0 && input[i] !== ' ' && input[i] !== '\n') {
        if (input[i] === '@') {
          const query = input.substring(i + 1, selectionStart);
          return query;
        }
        i--;
      }
      return null;
    },
    [],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange(newValue);

      const selectionStart = e.target.selectionStart;
      const query = checkForMentionTrigger(newValue, selectionStart);

      if (query !== null) {
        setShowSuggestions(true);
        const newSuggestions = generateSuggestions(query);
        setSuggestions(newSuggestions);
        setActiveSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
      }
    },
    [checkForMentionTrigger, generateSuggestions, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
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
    },
    // biome-ignore lint/correctness/noInvalidUseBeforeDeclaration: lint debt cleanup
    [showSuggestions, suggestions, activeSuggestionIndex, insertMention],
  );

  const insertMention = useCallback(
    (suggestion: MentionSuggestion) => {
      if (!inputRef.current) return;

      const cursorPos = inputRef.current.selectionStart || 0;
      const textBefore = inputValue.substring(0, cursorPos);
      const textAfter = inputValue.substring(cursorPos);

      // Find the @ symbol and extract the query
      let i = cursorPos - 1;
      while (i >= 0 && textBefore[i] !== ' ' && textBefore[i] !== '\n') {
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
          if (inputRef.current) {
            const newCursorPos = i + suggestion.label.length + 1;
            inputRef.current.focus();
            inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);

        setShowSuggestions(false);
      }
    },
    [inputValue, onChange],
  );

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current !== e.target
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
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {showSuggestions &&
        suggestions.length > 0 &&
        inputRef.current &&
        createPortal(
          <div
            ref={suggestionsRef}
            className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1"
            style={{
              top:
                inputRef.current.getBoundingClientRect().bottom +
                window.scrollY +
                'px',
              left:
                inputRef.current.getBoundingClientRect().left +
                window.scrollX +
                'px',
              width: `${inputRef.current.getBoundingClientRect().width}px`,
            }}
          >
            {suggestions.map((suggestion, index) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: lint debt cleanup
// biome-ignore lint/a11y/useKeyWithClickEvents: lint debt cleanup
<div
                key={suggestion.id}
                className={`p-2 cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground ${
                  index === activeSuggestionIndex
                    ? 'bg-accent text-accent-foreground'
                    : ''
                }`}
                onClick={() => insertMention(suggestion)}
              >
                <div className="font-medium">{suggestion.label}</div>
                <div className="text-xs text-muted-foreground">
                  {suggestion.category}: {String(suggestion.value)}
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
