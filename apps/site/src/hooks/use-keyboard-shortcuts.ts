import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  cmd?: boolean; // For Mac command key
  callback: (e: KeyboardEvent) => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const { key, ctrl, shift, alt, cmd, callback } = shortcut;
        
        // Check if the required modifiers are pressed
        const isCtrlPressed = ctrl ? e.ctrlKey : !e.ctrlKey;
        const isShiftPressed = shift ? e.shiftKey : !e.shiftKey;
        const isAltPressed = alt ? e.altKey : !e.altKey;
        const isCmdPressed = cmd ? e.metaKey : !e.metaKey;
        
        // For Mac cmd key, we check metaKey, not ctrlKey
        const isModifierCorrect = 
          (ctrl && !cmd ? e.ctrlKey : !ctrl) &&
          (shift ? e.shiftKey : !shift) &&
          (alt ? e.altKey : !alt) &&
          (cmd ? e.metaKey : !cmd);
        
        // On Mac, Cmd key is metaKey, and Ctrl key is controlKey
        const isMacCmdCorrect = cmd ? e.metaKey : true;
        const isWinCtrlCorrect = ctrl && !cmd ? e.ctrlKey : true;
        
        // Check if the key and all required modifiers match
        if (
          e.key.toLowerCase() === key.toLowerCase() && 
          isModifierCorrect &&
          isMacCmdCorrect &&
          isWinCtrlCorrect
        ) {
          e.preventDefault();
          callback(e);
          return; // Exit after handling the first matching shortcut
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

// Common shortcut presets
export const commonShortcuts = {
  save: { key: 's', ctrl: true, callback: (e: KeyboardEvent) => console.log('Save shortcut') },
  new: { key: 'n', ctrl: true, callback: (e: KeyboardEvent) => console.log('New item shortcut') },
  search: { key: '/', callback: (e: KeyboardEvent) => console.log('Search shortcut') },
  escape: { key: 'Escape', callback: (e: KeyboardEvent) => console.log('Escape shortcut') },
};