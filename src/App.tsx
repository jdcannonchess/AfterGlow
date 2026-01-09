import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TodayView } from './components/TodayView';
import { AllTasksView } from './components/AllTasksView';
import { KeyboardHint } from './components/KeyboardHint';
import { useTaskStore } from './stores/taskStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export type ViewType = 'today' | 'all';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const { loadTasks, isLoading } = useTaskStore();

  const handleQuickAdd = useCallback(() => {
    // Focus quick add - could be enhanced to actually trigger it
    console.log('Quick add triggered');
  }, []);

  useKeyboardShortcuts({
    onViewChange: setCurrentView,
    onQuickAdd: handleQuickAdd,
  });

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return <TodayView />;
      case 'all':
        return <AllTasksView />;
      default:
        return <TodayView />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-board-bg flex items-center justify-center">
        <div className="text-board-muted animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-board-bg flex overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-hidden">
        {renderView()}
      </main>
      <KeyboardHint />
    </div>
  );
}

export default App;

