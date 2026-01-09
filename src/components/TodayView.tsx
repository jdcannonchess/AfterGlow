import { useState, useMemo, useEffect } from 'react';
import { Sun, CheckCircle2, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { TaskCard } from './TaskCard';
import { ProgressBar } from './ProgressBar';
import { format, isToday, parseISO, isSameDay, addDays, subDays, startOfDay, isBefore, isSameDay as isSameDayCheck, isValid } from 'date-fns';
import { PRIORITY_WEIGHT, Task } from '../types/task';
import { doesRecurringTaskApplyToDate } from '../utils/recurrence';
import { formatMinutesToTime } from '../utils/time';

// Minimum date - cannot navigate before this date
const MIN_DATE = new Date('2026-01-07');
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

type TabType = 'todo' | 'completed';

// Helper to get tasks for a specific date (includes recurring tasks that apply to the date)
function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter(task => {
    if (task.status === 'done') return false;
    
    // For one-off tasks, check the due date
    if (task.type === 'one-off') {
      if (!task.dueDate) return false;
      return isSameDay(parseISO(task.dueDate), date);
    }
    
    // For recurring tasks, check:
    // 1. The pattern applies to this date
    // 2. The task's dueDate is on or before the target date (so future instances don't show early)
    // 3. The task hasn't been ended, or the date is on or before the endedAt date
    if (task.type === 'recurring' && task.recurrence) {
      const patternMatches = doesRecurringTaskApplyToDate(task.recurrence, date);
      const dueDateArrived = !task.dueDate || startOfDay(parseISO(task.dueDate)) <= startOfDay(date);
      const notEnded = !task.endedAt || startOfDay(date) <= startOfDay(parseISO(task.endedAt));
      return patternMatches && dueDateArrived && notEnded;
    }
    
    return false;
  });
}

// Helper to get overdue tasks (before selected date) - only for one-off tasks
function getOverdueTasks(tasks: Task[], beforeDate: Date): Task[] {
  return tasks.filter(task => {
    if (task.status === 'done') return false;
    if (task.type !== 'one-off') return false; // Recurring tasks don't have overdue
    if (!task.dueDate) return false;
    const dueDate = parseISO(task.dueDate);
    return dueDate < startOfDay(beforeDate);
  });
}

interface TodayViewProps {
  onEdit?: (task: Task) => void;
}

export function TodayView({ onEdit }: TodayViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('todo');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const { tasks, reorderTasks, uncompleteTask, selectedDate: storeSelectedDate, setSelectedDate: setStoreSelectedDate } = useTaskStore();

  // If navigating from weekly view, use the store's selected date
  useEffect(() => {
    if (storeSelectedDate) {
      setSelectedDate(storeSelectedDate);
      setStoreSelectedDate(null); // Clear after using
    }
  }, [storeSelectedDate, setStoreSelectedDate]);

  // Handle task expansion - only one task can be expanded at a time
  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId);
  };
  
  const isSelectedToday = isToday(selectedDate);
  
  // Get tasks for the selected date
  const tasksForDate = getTasksForDate(tasks, selectedDate);
  
  // If viewing today, also include overdue tasks
  const overdueTasks = isSelectedToday ? getOverdueTasks(tasks, selectedDate) : [];
  
  // Combine all active tasks, sorted by priority (p0 first, p4 last)
  const allDayTasks = [...overdueTasks, ...tasksForDate].sort((a, b) => {
    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });

  // Calculate time summary for tasks with estimates
  const timeSummary = useMemo(() => {
    const tasksWithEstimates = allDayTasks.filter(t => t.estimatedMinutes && t.estimatedMinutes > 0);
    const totalMinutes = tasksWithEstimates.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    return {
      totalMinutes,
      taskCount: tasksWithEstimates.length,
      formatted: formatMinutesToTime(totalMinutes),
    };
  }, [allDayTasks]);

  // Get tasks completed on the selected date
  const completedOnDate = tasks.filter(t => 
    t.status === 'done' && 
    t.completedAt && 
    isSameDay(parseISO(t.completedAt), selectedDate)
  ).sort((a, b) => {
    // Sort by completion time, most recent first
    if (a.completedAt && b.completedAt) {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    }
    return 0;
  });

  // Calculate progress - completed time vs total time for the day
  const progressData = useMemo(() => {
    const completedMinutes = completedOnDate
      .filter(t => t.estimatedMinutes && t.estimatedMinutes > 0)
      .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const pendingMinutes = timeSummary.totalMinutes;
    const totalMinutes = completedMinutes + pendingMinutes;
    return {
      completedMinutes,
      totalMinutes,
    };
  }, [completedOnDate, timeSummary.totalMinutes]);

  const dateStr = format(selectedDate, 'EEEE, MMMM d');
  
  // Check if we can go to previous day (not before MIN_DATE)
  const canGoToPreviousDay = !isBefore(subDays(selectedDate, 1), MIN_DATE) && !isSameDayCheck(selectedDate, MIN_DATE);
  
  const goToPreviousDay = () => {
    if (canGoToPreviousDay) {
      setSelectedDate(subDays(selectedDate, 1));
    }
  };
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());
  
  const [pendingDate, setPendingDate] = useState<string>(format(selectedDate, 'yyyy-MM-dd'));
  
  const handleDatePickerSubmit = () => {
    if (pendingDate && pendingDate.length === 10) {
      const newDate = parseISO(pendingDate);
      if (isValid(newDate) && !isBefore(newDate, MIN_DATE)) {
        setSelectedDate(newDate);
      }
    }
    setShowDatePicker(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = allDayTasks.findIndex((t) => t.id === active.id);
      const newIndex = allDayTasks.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTasks = [...allDayTasks];
        const [movedTask] = reorderedTasks.splice(oldIndex, 1);
        reorderedTasks.splice(newIndex, 0, movedTask);

        // Merge back with all tasks
        const otherTasks = tasks.filter(t => !allDayTasks.find(st => st.id === t.id));
        const newAllTasks = [...otherTasks, ...reorderedTasks];
        
        reorderTasks(newAllTasks);
      }
    }
  };

  const displayedTasks = activeTab === 'todo' ? allDayTasks : completedOnDate;

  return (
    <div className="h-full flex flex-col bg-board-bg">
      {/* Header with date and navigation */}
      <header className="px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Navigation arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousDay}
                disabled={!canGoToPreviousDay}
                className={`p-2 rounded-lg transition-colors ${
                  canGoToPreviousDay 
                    ? 'hover:bg-board-elevated text-board-muted hover:text-white' 
                    : 'text-board-border cursor-not-allowed'
                }`}
                title={canGoToPreviousDay ? "Previous day" : "Cannot go before January 7, 2026"}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToNextDay}
                className="p-2 rounded-lg hover:bg-board-elevated text-board-muted hover:text-white transition-colors"
                title="Next day"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!showDatePicker) {
                      setPendingDate(format(selectedDate, 'yyyy-MM-dd'));
                    }
                    setShowDatePicker(!showDatePicker);
                  }}
                  className="text-2xl font-semibold text-white hover:text-accent-gold transition-colors cursor-pointer"
                  title="Click to pick a date"
                >
                  {isSelectedToday ? 'Today' : format(selectedDate, 'MMM d')}
                </button>
                {!isSelectedToday && (
                  <button
                    onClick={goToToday}
                    className="px-2 py-1 text-xs rounded-md bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 transition-colors"
                  >
                    Today
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  if (!showDatePicker) {
                    setPendingDate(format(selectedDate, 'yyyy-MM-dd'));
                  }
                  setShowDatePicker(!showDatePicker);
                }}
                className="text-sm text-board-muted mt-1 hover:text-gray-300 transition-colors cursor-pointer"
                title="Click to pick a date"
              >
                {dateStr}
              </button>
              
              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <>
                  {/* Backdrop to close picker when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDatePicker(false)}
                  />
                  <div 
                    className="absolute top-full left-0 mt-2 z-50 bg-board-elevated rounded-lg shadow-xl border border-board-border p-3 animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={pendingDate}
                        min="2026-01-07"
                        onChange={(e) => setPendingDate(e.target.value)}
                        autoFocus
                        className="bg-board-surface text-white px-3 py-2 rounded-lg border border-board-border focus:outline-none focus:border-accent-gold"
                      />
                      <button
                        onClick={handleDatePickerSubmit}
                        className="px-3 py-2 bg-accent-gold text-black rounded-lg font-medium hover:bg-accent-warm transition-colors"
                      >
                        Go
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {timeSummary.totalMinutes > 0 && (
            <div className="flex items-center gap-1.5 text-right">
              <Clock size={14} className="text-accent-gold" />
              <span className="text-lg font-semibold text-accent-gold">{timeSummary.formatted}</span>
              <span className="text-xs text-board-muted">
                ({timeSummary.taskCount} {timeSummary.taskCount === 1 ? 'task' : 'tasks'})
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Progress Bar - only show when there are tasks with time estimates */}
      {progressData.totalMinutes > 0 && (
        <div className="px-8 pb-4">
          <ProgressBar 
            completedMinutes={progressData.completedMinutes}
            totalMinutes={progressData.totalMinutes}
          />
        </div>
      )}

      {/* Tab Navigation - styled as underlined tabs */}
      <div className="px-8 border-b border-board-border">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('todo')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'todo'
                ? 'text-accent-gold'
                : 'text-board-muted hover:text-gray-300'
            }`}
          >
            <Sun size={16} />
            To Do
            {allDayTasks.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === 'todo' ? 'bg-accent-gold/20 text-accent-gold' : 'bg-board-elevated text-board-muted'
              }`}>
                {allDayTasks.length}
              </span>
            )}
            {activeTab === 'todo' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-gold rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'completed'
                ? 'text-status-active'
                : 'text-board-muted hover:text-gray-300'
            }`}
          >
            <CheckCircle2 size={16} />
            Completed
            {completedOnDate.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === 'completed' ? 'bg-status-active/20 text-status-active' : 'bg-board-elevated text-board-muted'
              }`}>
                {completedOnDate.length}
              </span>
            )}
            {activeTab === 'completed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-status-active rounded-full" />
            )}
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Empty states */}
        {displayedTasks.length === 0 && activeTab === 'todo' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-status-active/10 flex items-center justify-center mb-4">
              <Sun size={32} className="text-status-active" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">All clear!</h2>
            <p className="text-board-muted text-sm max-w-sm">
              No switchbacks for today. Add something new or enjoy your free time.
            </p>
          </div>
        )}

        {displayedTasks.length === 0 && activeTab === 'completed' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-board-elevated flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-board-muted" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">No completed switchbacks yet</h2>
            <p className="text-board-muted text-sm max-w-sm">
              Switchbacks you complete today will appear here.
            </p>
          </div>
        )}

        {/* Tasks List */}
        {displayedTasks.length > 0 && activeTab === 'todo' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayedTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {displayedTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                    isExpanded={expandedTaskId === task.id}
                    onToggleExpand={() => handleToggleExpand(task.id)}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Completed tasks list (no drag and drop) - click to uncomplete */}
        {displayedTasks.length > 0 && activeTab === 'completed' && (
          <div className="space-y-2">
            {displayedTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => uncompleteTask(task.id)}
                className="w-full text-left bg-board-surface rounded-lg border border-board-border px-3 py-2.5 opacity-60 hover:opacity-80 hover:border-board-muted transition-all cursor-pointer"
                title="Click to mark as incomplete"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-status-active bg-status-active/20 flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-status-active" />
                  </div>
                  <p className="text-sm text-gray-400 line-through flex-1">{task.title}</p>
                  {task.completedAt && (
                    <span className="text-xs text-board-muted">
                      {format(parseISO(task.completedAt), 'h:mm a')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
