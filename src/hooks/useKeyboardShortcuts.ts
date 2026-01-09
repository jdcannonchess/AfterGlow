import { useEffect, useCallback } from 'react';
import { ViewType } from '../App';

interface UseKeyboardShortcutsProps {
  onViewChange: (view: ViewType) => void;
  onQuickAdd: () => void;
}

export function useKeyboardShortcuts({ 
  onViewChange, 
  onQuickAdd 
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    // Meta/Ctrl + key shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onQuickAdd();
          break;
        case '1':
          e.preventDefault();
          onViewChange('today');
          break;
        case '2':
          e.preventDefault();
          onViewChange('all');
          break;
        case '3':
          e.preventDefault();
          onViewChange('recurring');
          break;
        case '4':
          e.preventDefault();
          onViewChange('someday');
          break;
        case '5':
          e.preventDefault();
          onViewChange('stakeholder');
          break;
      }
    }

    // Single key shortcuts (when not in input)
    switch (e.key.toLowerCase()) {
      case 't':
        if (!e.metaKey && !e.ctrlKey) {
          onViewChange('today');
        }
        break;
      case 'a':
        if (!e.metaKey && !e.ctrlKey) {
          onViewChange('all');
        }
        break;
      case 'r':
        if (!e.metaKey && !e.ctrlKey) {
          onViewChange('recurring');
        }
        break;
      case 's':
        if (!e.metaKey && !e.ctrlKey) {
          onViewChange('someday');
        }
        break;
      case '?':
        // Could show help modal
        break;
    }
  }, [onViewChange, onQuickAdd]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

