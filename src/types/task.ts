export type Priority = 'p0' | 'p1' | 'p2' | 'p3' | 'p4';

export type TaskStatus = 
  | 'not-started' 
  | 'in-progress' 
  | 'waiting' 
  | 'needs-review' 
  | 'blocked' 
  | 'someday' 
  | 'done';

export type TaskType = 'one-off' | 'recurring';

export type RecurrencePattern = 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'yearly' 
  | 'business-days' 
  | 'nth-weekday';

export interface RecurrenceRule {
  pattern: RecurrencePattern;
  weekdays?: number[];      // 0-6, Sun-Sat
  interval?: number;        // Every N days/weeks/months
  nthWeek?: number;         // 1-53 for nth weekday of month/quarter/year
  dayOfMonth?: number;      // 1-31 for monthly patterns
  scope?: 'month' | 'quarter' | 'year';  // For nth-weekday scope
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  dueDate?: string;
  completedAt?: string;
  endedAt?: string;           // Date when a recurring task was ended (stops appearing after this date)
  notes?: string;
  stakeholders?: string[];
  labels?: string[];
  blockerReason?: string;
  recurrence?: RecurrenceRule;
  parentRecurringId?: string;
  sortOrder: number;
  estimatedMinutes?: number;  // Optional time estimate in minutes
}

export interface TaskData {
  tasks: Task[];
  labels: string[];
  stakeholders: string[];
}

// Priority weight for sorting (lower = higher priority)
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  'p0': 0,
  'p1': 1,
  'p2': 2,
  'p3': 3,
  'p4': 4,
};

// Status weight for sorting (lower = more active)
export const STATUS_WEIGHT: Record<TaskStatus, number> = {
  'in-progress': 0,
  'not-started': 1,
  'needs-review': 2,
  'waiting': 3,
  'blocked': 4,
  'someday': 5,
  'done': 6,
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  'p0': 'P0 - Critical',
  'p1': 'P1 - High',
  'p2': 'P2 - Normal',
  'p3': 'P3 - Low',
  'p4': 'P4 - Lowest',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'waiting': 'Waiting',
  'needs-review': 'Needs Review',
  'blocked': 'Blocked',
  'someday': 'Someday',
  'done': 'Done',
};

