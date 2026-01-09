import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-accent-gold hover:bg-accent-warm 
        shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center
        hover:scale-105 active:scale-95"
      title="Create new task"
      aria-label="Create new task"
    >
      <Plus size={28} className="text-black" strokeWidth={2.5} />
    </button>
  );
}
