import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TodayView } from './components/TodayView';
import { AllTasksView } from './components/AllTasksView';
import { WeeklyView } from './components/WeeklyView';
import { KeyboardHint } from './components/KeyboardHint';
import { FloatingActionButton } from './components/FloatingActionButton';
import { CreateTaskModal } from './components/CreateTaskModal';
import { useTaskStore } from './stores/taskStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export type ViewType = 'today' | 'all' | 'week';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { loadTasks, isLoading } = useTaskStore();

  useKeyboardShortcuts({
    onViewChange: setCurrentView,
  });

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleNavigateToDate = useCallback((date: Date) => {
    useTaskStore.getState().setSelectedDate(date);
    setCurrentView('today');
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return <TodayView />;
      case 'all':
        return <AllTasksView />;
      case 'week':
        return <WeeklyView onNavigateToDate={handleNavigateToDate} />;
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
      <FloatingActionButton onClick={() => setIsCreateModalOpen(true)} />
      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}

export default App;

