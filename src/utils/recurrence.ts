import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  getDay, 
  setDay, 
  isWeekend,
  startOfMonth,
  startOfYear,
  startOfQuarter,
  getDate,
  getDaysInMonth,
  format,
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns';
import { RecurrenceRule } from '../types/task';

/**
 * Calculate the next due date based on a recurrence rule
 */
export function getNextRecurrenceDate(
  rule: RecurrenceRule, 
  currentDueDate?: string
): string | undefined {
  const baseDate = currentDueDate ? parseISO(currentDueDate) : new Date();
  let nextDate: Date;

  switch (rule.pattern) {
    case 'weekly':
      nextDate = getNextWeeklyDate(baseDate, rule.weekdays);
      break;

    case 'biweekly':
      nextDate = addWeeks(getNextWeeklyDate(baseDate, rule.weekdays), 1);
      break;

    case 'monthly':
      nextDate = getNextMonthlyDate(baseDate, rule.dayOfMonth);
      break;

    case 'quarterly':
      nextDate = addMonths(baseDate, 3);
      if (rule.dayOfMonth) {
        nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), rule.dayOfMonth);
      }
      break;

    case 'yearly':
      nextDate = addYears(baseDate, 1);
      break;

    case 'business-days':
      nextDate = getNextBusinessDay(baseDate, rule.interval || 1);
      break;

    case 'nth-weekday':
      nextDate = getNextNthWeekdayWithScope(
        baseDate, 
        rule.nthWeek || 1, 
        rule.weekdays?.[0] || 1,
        rule.scope || 'month'
      );
      break;

    default:
      return undefined;
  }

  return format(nextDate, 'yyyy-MM-dd');
}

/**
 * Get the next occurrence of specific weekdays
 */
function getNextWeeklyDate(fromDate: Date, weekdays?: number[]): Date {
  if (!weekdays || weekdays.length === 0) {
    return addWeeks(fromDate, 1);
  }

  const today = getDay(fromDate);
  const sortedDays = [...weekdays].sort((a, b) => a - b);
  
  // Find next weekday after current day
  for (const day of sortedDays) {
    if (day > today) {
      return setDay(fromDate, day);
    }
  }
  
  // If no day found this week, go to next week's first occurrence
  return setDay(addWeeks(fromDate, 1), sortedDays[0]);
}

/**
 * Get next monthly date
 */
function getNextMonthlyDate(fromDate: Date, dayOfMonth?: number): Date {
  const targetDay = dayOfMonth || getDate(fromDate);
  let nextMonth = addMonths(fromDate, 1);
  
  // Handle months with fewer days
  const daysInMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const actualDay = Math.min(targetDay, daysInMonth);
  
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), actualDay);
}

/**
 * Get next business day (skip weekends)
 */
function getNextBusinessDay(fromDate: Date, skipDays: number = 1): Date {
  let current = addDays(fromDate, 1);
  let daysSkipped = 0;
  
  while (daysSkipped < skipDays) {
    if (!isWeekend(current)) {
      daysSkipped++;
      if (daysSkipped >= skipDays) break;
    }
    current = addDays(current, 1);
  }
  
  // Make sure we land on a business day
  while (isWeekend(current)) {
    current = addDays(current, 1);
  }
  
  return current;
}

/**
 * Get the Nth weekday with scope support (month, quarter, or year)
 */
function getNextNthWeekdayWithScope(
  fromDate: Date, 
  nthWeek: number, 
  weekday: number,
  scope: 'month' | 'quarter' | 'year'
): Date {
  switch (scope) {
    case 'month':
      return getNextNthWeekdayOfMonth(fromDate, nthWeek, weekday);
    case 'quarter':
      return getNextNthWeekdayOfQuarter(fromDate, nthWeek, weekday);
    case 'year':
      return getNextNthWeekdayOfYear(fromDate, nthWeek, weekday);
    default:
      return getNextNthWeekdayOfMonth(fromDate, nthWeek, weekday);
  }
}

/**
 * Get the Nth weekday of next month (e.g., 2nd Tuesday)
 */
function getNextNthWeekdayOfMonth(fromDate: Date, nthWeek: number, weekday: number): Date {
  const targetMonth = addMonths(startOfMonth(fromDate), 1);
  let current = startOfMonth(targetMonth);
  
  // Find the first occurrence of the weekday
  while (getDay(current) !== weekday) {
    current = addDays(current, 1);
  }
  
  // Move to the Nth occurrence
  current = addWeeks(current, nthWeek - 1);
  
  return current;
}

/**
 * Get the Nth weekday of next quarter (e.g., 2nd Saturday of the quarter)
 */
function getNextNthWeekdayOfQuarter(fromDate: Date, nthWeek: number, weekday: number): Date {
  // Move to start of next quarter
  const currentQuarterStart = startOfQuarter(fromDate);
  const nextQuarterStart = addMonths(currentQuarterStart, 3);
  
  let current = nextQuarterStart;
  
  // Find the first occurrence of the weekday in the quarter
  while (getDay(current) !== weekday) {
    current = addDays(current, 1);
  }
  
  // Move to the Nth occurrence
  current = addWeeks(current, nthWeek - 1);
  
  return current;
}

/**
 * Get the Nth weekday of next year (e.g., 32nd Monday of the year)
 */
function getNextNthWeekdayOfYear(fromDate: Date, nthWeek: number, weekday: number): Date {
  // Move to start of next year
  const nextYearStart = startOfYear(addYears(fromDate, 1));
  
  let current = nextYearStart;
  
  // Find the first occurrence of the weekday in the year
  while (getDay(current) !== weekday) {
    current = addDays(current, 1);
  }
  
  // Move to the Nth occurrence
  current = addWeeks(current, nthWeek - 1);
  
  return current;
}

/**
 * Get the last business day (Mon-Fri) of a given month
 */
function getLastBusinessDayOfMonth(date: Date): number {
  const lastDay = getDaysInMonth(date);
  let day = lastDay;
  let checkDate = new Date(date.getFullYear(), date.getMonth(), day);
  
  // Move back from last day until we hit a weekday (Mon-Fri)
  while (isWeekend(checkDate) && day > 1) {
    day--;
    checkDate = new Date(date.getFullYear(), date.getMonth(), day);
  }
  return day;
}

/**
 * Check if a recurring task should appear on a specific date based on its recurrence rule
 */
export function doesRecurringTaskApplyToDate(rule: RecurrenceRule, targetDate: Date): boolean {
  const dayOfWeek = getDay(targetDate); // 0-6, Sun-Sat
  
  switch (rule.pattern) {
    case 'weekly':
    case 'biweekly':
      // For weekly/biweekly patterns with specified weekdays
      if (rule.weekdays && rule.weekdays.length > 0) {
        return rule.weekdays.includes(dayOfWeek);
      }
      // If no weekdays specified, it shows every day (fallback)
      return true;

    case 'monthly':
      // For monthly patterns, check if it's the right day of month
      // If target day doesn't exist in this month, show on last business day
      if (rule.dayOfMonth) {
        const targetDay = rule.dayOfMonth;
        const currentDay = getDate(targetDate);
        const daysInMonth = getDaysInMonth(targetDate);
        
        if (targetDay > daysInMonth) {
          // Target day doesn't exist in this month, show on last business day
          const lastBusinessDay = getLastBusinessDayOfMonth(targetDate);
          return currentDay === lastBusinessDay;
        }
        return currentDay === targetDay;
      }
      return false;

    case 'quarterly':
      // For quarterly, check if it's the right day and we're in a quarter-start month
      // If target day doesn't exist in this month, show on last business day
      const month = targetDate.getMonth();
      const isQuarterMonth = month === 0 || month === 3 || month === 6 || month === 9;
      if (rule.dayOfMonth && isQuarterMonth) {
        const qTargetDay = rule.dayOfMonth;
        const qCurrentDay = getDate(targetDate);
        const qDaysInMonth = getDaysInMonth(targetDate);
        
        if (qTargetDay > qDaysInMonth) {
          // Target day doesn't exist in this month, show on last business day
          const qLastBusinessDay = getLastBusinessDayOfMonth(targetDate);
          return qCurrentDay === qLastBusinessDay;
        }
        return qCurrentDay === qTargetDay;
      }
      return false;

    case 'yearly':
      // Yearly tasks only show once a year on their specific date
      return false; // Would need original date to compare

    case 'business-days':
      // Business days = Monday-Friday
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case 'nth-weekday':
      // nth weekday of month/quarter/year (e.g., "2nd Monday of each quarter")
      if (!rule.nthWeek || !rule.weekdays || rule.weekdays.length === 0) {
        return false;
      }
      
      const nthTargetWeekday = rule.weekdays[0]; // e.g., 1 for Monday
      const nthTargetN = rule.nthWeek; // e.g., 2 for "2nd"
      
      // Check if target date is the correct day of week
      if (dayOfWeek !== nthTargetWeekday) {
        return false;
      }
      
      // Determine the scope start date
      let scopeStart: Date;
      const nthScope = rule.scope || 'month';
      
      if (nthScope === 'quarter') {
        // Check if we're in a quarter-start month (Jan, Apr, Jul, Oct)
        const qMonth = targetDate.getMonth();
        const isQMonth = qMonth === 0 || qMonth === 3 || qMonth === 6 || qMonth === 9;
        if (!isQMonth) return false;
        scopeStart = startOfMonth(targetDate);
      } else if (nthScope === 'year') {
        // Only January
        if (targetDate.getMonth() !== 0) return false;
        scopeStart = startOfYear(targetDate);
      } else {
        // month scope
        scopeStart = startOfMonth(targetDate);
      }
      
      // Count which occurrence of this weekday we're at
      let count = 0;
      let checkDate = scopeStart;
      const targetDayOfMonth = getDate(targetDate);
      
      while (getDate(checkDate) <= targetDayOfMonth) {
        if (getDay(checkDate) === nthTargetWeekday) {
          count++;
          if (getDate(checkDate) === targetDayOfMonth) {
            return count === nthTargetN;
          }
        }
        checkDate = addDays(checkDate, 1);
      }
      return false;

    default:
      return false;
  }
}

/**
 * Check if a task should appear today based on its due date
 */
export function isDueToday(dueDate?: string): boolean {
  if (!dueDate) return false;
  
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  
  return format(today, 'yyyy-MM-dd') === format(due, 'yyyy-MM-dd');
}

/**
 * Check if a task is overdue
 */
export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  
  return isBefore(due, today);
}

/**
 * Check if a task is due in the future
 */
export function isFuture(dueDate?: string): boolean {
  if (!dueDate) return false;
  
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  
  return isAfter(due, today);
}

/**
 * Format a recurrence rule for display
 */
export function formatRecurrence(rule: RecurrenceRule): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  switch (rule.pattern) {
    case 'weekly':
      if (rule.weekdays && rule.weekdays.length > 0) {
        const days = rule.weekdays.map(d => dayNames[d]).join(', ');
        return `Weekly on ${days}`;
      }
      return 'Weekly';

    case 'biweekly':
      if (rule.weekdays && rule.weekdays.length > 0) {
        const days = rule.weekdays.map(d => dayNames[d]).join(', ');
        return `Every 2 weeks on ${days}`;
      }
      return 'Every 2 weeks';

    case 'monthly':
      if (rule.dayOfMonth) {
        return `Monthly on the ${ordinal(rule.dayOfMonth)}`;
      }
      return 'Monthly';

    case 'quarterly':
      if (rule.dayOfMonth) {
        return `Quarterly on day ${rule.dayOfMonth}`;
      }
      return 'Quarterly';

    case 'yearly':
      return 'Yearly';

    case 'business-days':
      if (rule.interval && rule.interval > 1) {
        return `Every ${rule.interval} business days`;
      }
      return 'Every business day';

    case 'nth-weekday':
      if (rule.nthWeek && rule.weekdays && rule.weekdays.length > 0) {
        const weekOrdinal = ordinal(rule.nthWeek);
        const day = fullDayNames[rule.weekdays[0]];
        const scope = rule.scope || 'month';
        
        switch (scope) {
          case 'month':
            return `${weekOrdinal} ${day} of month`;
          case 'quarter':
            return `${weekOrdinal} ${day} of quarter`;
          case 'year':
            return `${weekOrdinal} ${day} of year`;
          default:
            return `${weekOrdinal} ${day}`;
        }
      }
      return 'Monthly';

    default:
      return 'Custom';
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
