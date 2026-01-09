import { Task, PRIORITY_WEIGHT, STATUS_WEIGHT, TaskStatus } from '../types/task';
import { isOverdue, isDueToday } from './recurrence';

export type TaskSection = 'overdue' | 'today' | 'someday' | 'future';

/**
 * Categorize a task into a section
 */
export function getTaskSection(task: Task): TaskSection {
  if (task.status === 'done') {
    return 'someday'; // Completed tasks don't show in active sections
  }

  if (task.status === 'someday') {
    return 'someday';
  }

  if (isOverdue(task.dueDate)) {
    return 'overdue';
  }

  if (isDueToday(task.dueDate)) {
    return 'today';
  }

  // No due date = treat as "today" work
  if (!task.dueDate) {
    return 'today';
  }

  return 'future';
}

/**
 * Sort tasks by priority and status
 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // First by priority
    const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by status
    const statusDiff = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
    if (statusDiff !== 0) return statusDiff;

    // Then by sort order
    return a.sortOrder - b.sortOrder;
  });
}

/**
 * Get tasks for the Today view, grouped by section
 */
export function getTodayViewTasks(tasks: Task[]): {
  overdue: Task[];
  today: Task[];
  someday: Task[];
} {
  const activeTasks = tasks.filter(t => t.status !== 'done');
  
  const overdue: Task[] = [];
  const today: Task[] = [];
  const someday: Task[] = [];

  for (const task of activeTasks) {
    const section = getTaskSection(task);
    
    switch (section) {
      case 'overdue':
        overdue.push(task);
        break;
      case 'today':
        today.push(task);
        break;
      case 'someday':
        someday.push(task);
        break;
      // Future tasks are not shown in Today view
    }
  }

  return {
    overdue: sortTasks(overdue),
    today: sortTasks(today),
    someday: sortTasks(someday),
  };
}

/**
 * Get all active (not done) tasks sorted
 */
export function getActiveTasks(tasks: Task[]): Task[] {
  return sortTasks(tasks.filter(t => t.status !== 'done'));
}

/**
 * Get recurring task templates (original recurring tasks)
 */
export function getRecurringTemplates(tasks: Task[]): Task[] {
  return sortTasks(
    tasks.filter(t => t.type === 'recurring' && !t.parentRecurringId)
  );
}

/**
 * Get someday/backlog tasks
 */
export function getSomedayTasks(tasks: Task[]): Task[] {
  return sortTasks(
    tasks.filter(t => t.status === 'someday')
  );
}

/**
 * Get tasks grouped by stakeholder
 */
export function getTasksByStakeholder(tasks: Task[]): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();
  const activeTasks = tasks.filter(t => t.status !== 'done');

  for (const task of activeTasks) {
    if (task.stakeholders && task.stakeholders.length > 0) {
      for (const stakeholder of task.stakeholders) {
        if (!grouped.has(stakeholder)) {
          grouped.set(stakeholder, []);
        }
        grouped.get(stakeholder)!.push(task);
      }
    } else {
      // Tasks without stakeholders go to "Unassigned"
      if (!grouped.has('Unassigned')) {
        grouped.set('Unassigned', []);
      }
      grouped.get('Unassigned')!.push(task);
    }
  }

  // Sort each group
  for (const [key, value] of grouped) {
    grouped.set(key, sortTasks(value));
  }

  return grouped;
}

/**
 * Get status display properties
 */
export function getStatusStyle(status: TaskStatus): {
  textClass: string;
  bgClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'in-progress':
      return {
        textClass: 'text-status-active',
        bgClass: 'bg-status-active/10',
        borderClass: 'border-status-active/30',
      };
    case 'blocked':
      return {
        textClass: 'text-status-blocked',
        bgClass: 'bg-status-blocked/10',
        borderClass: 'border-status-blocked/30',
      };
    case 'waiting':
      return {
        textClass: 'text-status-waiting',
        bgClass: 'bg-status-waiting/10',
        borderClass: 'border-status-waiting/30',
      };
    case 'needs-review':
      return {
        textClass: 'text-status-review',
        bgClass: 'bg-status-review/10',
        borderClass: 'border-status-review/30',
      };
    case 'someday':
      return {
        textClass: 'text-board-muted',
        bgClass: 'bg-board-muted/10',
        borderClass: 'border-board-muted/30',
      };
    default:
      return {
        textClass: 'text-gray-400',
        bgClass: 'bg-gray-500/10',
        borderClass: 'border-gray-500/30',
      };
  }
}

/**
 * Sort tasks by creation date (newest first)
 */
export function sortByCreatedAt(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Sort tasks alphabetically by first label (tasks without labels at end)
 */
export function sortByLabels(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aLabel = a.labels?.[0]?.toLowerCase() ?? '';
    const bLabel = b.labels?.[0]?.toLowerCase() ?? '';
    
    // Tasks without labels go to the end
    if (!aLabel && bLabel) return 1;
    if (aLabel && !bLabel) return -1;
    if (!aLabel && !bLabel) return 0;
    
    return aLabel.localeCompare(bLabel);
  });
}

