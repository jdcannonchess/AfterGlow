import { useMemo, useState } from 'react';
import { CalendarDays, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { format, startOfWeek, addDays, subDays, isToday, parseISO, isSameDay, startOfDay } from 'date-fns';
import { Task, PRIORITY_WEIGHT } from '../types/task';
import { doesRecurringTaskApplyToDate } from '../utils/recurrence';
import { formatMinutesToTime } from '../utils/time';

interface WeeklyViewProps {
  onNavigateToDate: (date: Date) => void;
}

// Helper to get tasks for a specific date (includes recurring tasks that apply to the date)
function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter(task => {
    // For one-off tasks, check the due date
    if (task.type === 'one-off') {
      if (!task.dueDate) return false;
      return isSameDay(parseISO(task.dueDate), date);
    }
    
    // For recurring tasks that are DONE, they have a specific dueDate for when that instance was due
    // Don't match them to future dates based on recurrence pattern
    if (task.type === 'recurring' && task.status === 'done') {
      if (!task.dueDate) return false;
      return isSameDay(parseISO(task.dueDate), date);
    }
    
    // For active recurring tasks, check:
    // 1. The pattern applies to this date
    // 2. The task's dueDate is on or before the target date
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

interface DayData {
  date: Date;
  tasks: Task[];
  totalMinutes: number;
  highPriorityTasks: Task[];
  isToday: boolean;
}

export function WeeklyView({ onNavigateToDate }: WeeklyViewProps) {
  const { tasks } = useTaskStore();

  // State for the selected week (default to current week)
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => 
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  // Check if viewing current week
  const currentWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 0 }), []);
  const isCurrentWeek = isSameDay(selectedWeekStart, currentWeekStart);

  // Navigation functions
  const goToPreviousWeek = () => setSelectedWeekStart(subDays(selectedWeekStart, 7));
  const goToNextWeek = () => setSelectedWeekStart(addDays(selectedWeekStart, 7));
  const goToThisWeek = () => setSelectedWeekStart(currentWeekStart);

  // Use selected week start
  const weekStart = selectedWeekStart;

  // Generate data for each day of the week
  const weekData = useMemo((): DayData[] => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dayTasks = getTasksForDate(tasks, date).sort((a, b) => 
        PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
      );
      const totalMinutes = dayTasks
        .filter(t => t.estimatedMinutes && t.estimatedMinutes > 0)
        .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
      const highPriorityTasks = dayTasks.filter(t => (t.priority === 'p0' || t.priority === 'p1') && t.status !== 'done');
      
      return {
        date,
        tasks: dayTasks,
        totalMinutes,
        highPriorityTasks,
        isToday: isToday(date),
      };
    });
  }, [weekStart, tasks]);

  // Find the max minutes for scaling the bars
  const maxMinutes = useMemo(() => {
    return Math.max(...weekData.map(d => d.totalMinutes), 60); // Minimum 60 for scaling
  }, [weekData]);

  // Calculate weekly total
  const weeklyTotal = useMemo(() => {
    return weekData.reduce((sum, day) => sum + day.totalMinutes, 0);
  }, [weekData]);

  return (
    <div className="h-full flex flex-col bg-board-bg">
      {/* Header */}
      <header className="px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Navigation arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousWeek}
                className="p-2 rounded-lg hover:bg-board-elevated text-board-muted hover:text-white transition-colors"
                title="Previous week"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 rounded-lg hover:bg-board-elevated text-board-muted hover:text-white transition-colors"
                title="Next week"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays size={24} className="text-accent-gold" />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-white">Week Overview</h1>
                  {!isCurrentWeek && (
                    <button
                      onClick={goToThisWeek}
                      className="px-2 py-1 text-xs rounded-md bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 transition-colors"
                    >
                      This Week
                    </button>
                  )}
                </div>
                <p className="text-sm text-board-muted mt-0.5">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
          {weeklyTotal > 0 && (
            <div className="flex items-center gap-1.5 text-right">
              <Clock size={14} className="text-accent-gold" />
              <span className="text-lg font-semibold text-accent-gold">{formatMinutesToTime(weeklyTotal)}</span>
              <span className="text-xs text-board-muted">this week</span>
            </div>
          )}
        </div>
      </header>

      {/* Week Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <div className="grid grid-cols-7 gap-3">
          {weekData.map((day) => (
            <DayCard
              key={day.date.toISOString()}
              day={day}
              maxMinutes={maxMinutes}
              onClick={() => onNavigateToDate(day.date)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DayCardProps {
  day: DayData;
  maxMinutes: number;
  onClick: () => void;
}

function DayCard({ day, maxMinutes, onClick }: DayCardProps) {
  const barHeight = day.totalMinutes > 0 
    ? Math.max((day.totalMinutes / maxMinutes) * 100, 8) 
    : 0;

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col rounded-lg border transition-all duration-200 text-left
        hover:border-accent-gold/50 hover:bg-board-elevated cursor-pointer
        ${day.isToday 
          ? 'bg-board-elevated border-accent-gold' 
          : 'bg-board-elevated/80 border-board-border/80'
        }
      `}
    >
      {/* Day Header */}
      <div className={`px-3 py-2 border-b ${day.isToday ? 'border-accent-gold/20' : 'border-board-border'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${day.isToday ? 'text-accent-gold' : 'text-board-muted'}`}>
            {format(day.date, 'EEE')}
          </span>
          {day.isToday && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-gold/20 text-accent-gold font-medium">
              TODAY
            </span>
          )}
        </div>
        <span className={`text-lg font-semibold ${day.isToday ? 'text-white' : 'text-gray-300'}`}>
          {format(day.date, 'd')}
        </span>
      </div>

      {/* Time Bar Section */}
      <div className="px-3 py-3 flex-1 flex flex-col">
        {/* Visual Time Bar */}
        <div className="h-20 flex items-end mb-2">
          {day.totalMinutes > 0 ? (
            <div 
              className="w-full bg-gradient-to-t from-accent-gold/60 to-accent-gold/30 rounded-t transition-all duration-300"
              style={{ height: `${barHeight}%` }}
            />
          ) : (
            <div className="w-full h-1 bg-board-border/50 rounded" />
          )}
        </div>

        {/* Time Summary */}
        <div className="flex items-center gap-1 mb-3">
          <Clock size={12} className="text-board-muted" />
          <span className={`text-sm font-medium ${day.totalMinutes > 0 ? 'text-white' : 'text-board-muted'}`}>
            {day.totalMinutes > 0 ? formatMinutesToTime(day.totalMinutes) : '—'}
          </span>
          <span className="text-xs text-board-muted">
            ({day.tasks.length} {day.tasks.length === 1 ? 'task' : 'tasks'})
          </span>
        </div>

        {/* High Priority Tasks */}
        {day.highPriorityTasks.length > 0 && (
          <div className="space-y-1.5 border-t border-board-border/50 pt-2">
            <div className="flex items-center gap-1 text-xs text-status-overdue">
              <AlertTriangle size={10} />
              <span className="font-medium">Urgent</span>
            </div>
            <div className="space-y-1">
              {day.highPriorityTasks.slice(0, 3).map((task) => (
                <div 
                  key={task.id}
                  className="text-xs text-gray-400 truncate"
                  title={task.title}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                    task.priority === 'p0' ? 'bg-status-overdue' : 'bg-orange-500'
                  }`} />
                  {task.title}
                </div>
              ))}
              {day.highPriorityTasks.length > 3 && (
                <div className="text-xs text-board-muted">
                  +{day.highPriorityTasks.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state for days with no tasks */}
        {day.tasks.length === 0 && (
          <div className="text-xs text-board-muted/60 italic">
            No tasks
          </div>
        )}
      </div>
    </button>
  );
}
