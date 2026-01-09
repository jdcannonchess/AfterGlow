import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

export function KeyboardHint() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('keyboard-hint-dismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (isDismissed) return;
    
    // Show hint after a short delay
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('keyboard-hint-dismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-board-elevated border border-board-border rounded-lg shadow-xl p-4 max-w-xs animate-slide-up z-50">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-board-muted hover:text-gray-300 transition-colors"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-center gap-2 mb-3">
        <Keyboard size={18} className="text-accent-gold" />
        <h3 className="text-sm font-medium text-white">Keyboard Shortcuts</h3>
      </div>
      
      <div className="space-y-2 text-xs text-board-muted">
        <div className="flex justify-between">
          <span>New switchback</span>
          <kbd className="px-1.5 py-0.5 bg-board-surface rounded text-gray-400">Ctrl+N</kbd>
        </div>
        <div className="flex justify-between">
          <span>Today view</span>
          <kbd className="px-1.5 py-0.5 bg-board-surface rounded text-gray-400">T</kbd>
        </div>
        <div className="flex justify-between">
          <span>Canopy</span>
          <kbd className="px-1.5 py-0.5 bg-board-surface rounded text-gray-400">A</kbd>
        </div>
        <div className="flex justify-between">
          <span>Recurring</span>
          <kbd className="px-1.5 py-0.5 bg-board-surface rounded text-gray-400">R</kbd>
        </div>
        <div className="flex justify-between">
          <span>Someday</span>
          <kbd className="px-1.5 py-0.5 bg-board-surface rounded text-gray-400">S</kbd>
        </div>
      </div>
    </div>
  );
}

