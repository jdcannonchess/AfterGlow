import { useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { format, startOfWeek, addDays, parseISO, isSameDay, startOfDay } from 'date-fns';
import { Task } from '../types/task';
import { doesRecurringTaskApplyToDate } from '../utils/recurrence';
import { formatMinutesToTime } from '../utils/time';

// Helper to get tasks for a specific date (reused from WeeklyView)
function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter(task => {
    // For one-off tasks, check the due date
    if (task.type === 'one-off') {
      if (!task.dueDate) return false;
      return isSameDay(parseISO(task.dueDate), date);
    }
    
    // For recurring tasks that are DONE, they have a specific dueDate for when that instance was due
    if (task.type === 'recurring' && task.status === 'done') {
      if (!task.dueDate) return false;
      return isSameDay(parseISO(task.dueDate), date);
    }
    
    // For active recurring tasks, check pattern matches
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
  totalMinutes: number;
  taskCount: number;
}

export function WeekHoursPreview() {
  const { tasks } = useTaskStore();

  // Get NEXT week starting from Sunday
  const nextWeekStart = useMemo(() => {
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    return addDays(currentWeekStart, 7); // Add 7 days to get next week
  }, []);

  // Generate data for each day of next week
  const weekData = useMemo((): DayData[] => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(nextWeekStart, i);
      const dayTasks = getTasksForDate(tasks, date);
      const totalMinutes = dayTasks
        .filter(t => t.estimatedMinutes && t.estimatedMinutes > 0)
        .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
      
      return {
        date,
        totalMinutes,
        taskCount: dayTasks.length,
      };
    });
  }, [nextWeekStart, tasks]);

  // Find the max minutes for scaling the bars
  const maxMinutes = useMemo(() => {
    return Math.max(...weekData.map(d => d.totalMinutes), 60); // Minimum 60 for scaling
  }, [weekData]);

  // Calculate weekly total
  const weeklyTotal = useMemo(() => {
    return weekData.reduce((sum, day) => sum + day.totalMinutes, 0);
  }, [weekData]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-medium text-white">Next Week</h3>
        <p className="text-xs text-board-muted">
          {format(nextWeekStart, 'MMM d')} - {format(addDays(nextWeekStart, 6), 'MMM d')}
        </p>
      </div>

      {/* Days */}
      <div className="flex-1 space-y-1.5">
        {weekData.map((day) => {
          const barWidth = day.totalMinutes > 0 
            ? Math.max((day.totalMinutes / maxMinutes) * 100, 8) 
            : 0;

          return (
            <div key={day.date.toISOString()} className="flex items-center gap-2">
              {/* Day label */}
              <span className="w-8 text-xs text-board-muted">
                {format(day.date, 'EEE')}
              </span>
              
              {/* Bar container */}
              <div className="flex-1 h-4 bg-board-bg rounded overflow-hidden">
                {day.totalMinutes > 0 ? (
                  <div 
                    className="h-full rounded bg-gradient-to-r from-accent-gold/60 to-accent-gold/30 transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                ) : null}
              </div>
              
              {/* Time display */}
              <span className={`w-12 text-xs text-right ${
                day.totalMinutes > 0 ? 'text-gray-300' : 'text-board-muted'
              }`}>
                {day.totalMinutes > 0 ? formatMinutesToTime(day.totalMinutes) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Weekly Total */}
      <div className="mt-3 pt-3 border-t border-board-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-board-muted">Total</span>
          <span className={`text-sm font-medium ${weeklyTotal > 0 ? 'text-accent-gold' : 'text-board-muted'}`}>
            {weeklyTotal > 0 ? formatMinutesToTime(weeklyTotal) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
