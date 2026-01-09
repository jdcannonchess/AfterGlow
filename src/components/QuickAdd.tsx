import { useState, useRef, useEffect } from 'react';
import { Plus, Flag, RefreshCw, Tag, X } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { Priority, TaskType, RecurrenceRule } from '../types/task';
import { PRIORITY_LABELS } from '../types/task';
import { format, getDate, getDaysInMonth, getDay, startOfMonth, startOfYear, addDays } from 'date-fns';
import { RecurrenceModal } from './RecurrenceModal';
import { formatRecurrence, doesRecurringTaskApplyToDate, getNextRecurrenceDate } from '../utils/recurrence';

interface QuickAddProps {
  defaultType?: TaskType;
}

export function QuickAdd({ defaultType = 'one-off' }: QuickAddProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('p2');
  const [taskType, setTaskType] = useState<TaskType>(defaultType);
  const [dueDate, setDueDate] = useState('');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [notes, setNotes] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const { addTask } = useTaskStore();

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (showLabelInput && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [showLabelInput]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Don't handle clicks when modal is open
      if (showRecurrenceModal) return;
      
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!title.trim()) {
          setIsExpanded(false);
        }
        setShowPriorityMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [title, showRecurrenceModal]);

  const handleAddLabel = () => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
      setNewLabel('');
      setShowLabelInput(false);
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter(l => l !== labelToRemove));
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLabel();
    } else if (e.key === 'Escape') {
      setNewLabel('');
      setShowLabelInput(false);
    }
  };

  const handleTypeChange = (type: TaskType) => {
    setTaskType(type);
    // Auto-open recurrence modal when switching to recurring
    if (type === 'recurring') {
      setShowRecurrenceModal(true);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const newTask: Parameters<typeof addTask>[0] = {
      title: title.trim(),
      type: taskType,
      priority,
      dueDate: dueDate || undefined,
      labels: labels.length > 0 ? labels : undefined,
      notes: notes.trim() || undefined,
    };

    if (taskType === 'recurring' && recurrenceRule) {
      newTask.recurrence = recurrenceRule;
      if (!dueDate) {
        const today = new Date();
        
        // For monthly tasks, check if target day is still upcoming this month
        if (recurrenceRule.pattern === 'monthly' && recurrenceRule.dayOfMonth) {
          const targetDay = recurrenceRule.dayOfMonth;
          const currentDay = getDate(today);
          const daysInMonth = getDaysInMonth(today);
          
          // Use the actual day or last day of month if target day doesn't exist
          const effectiveTargetDay = Math.min(targetDay, daysInMonth);
          
          if (currentDay <= effectiveTargetDay) {
            // Target day is today or still upcoming this month
            newTask.dueDate = format(
              new Date(today.getFullYear(), today.getMonth(), effectiveTargetDay),
              'yyyy-MM-dd'
            );
          } else {
            // Target day has passed, use next occurrence
            newTask.dueDate = getNextRecurrenceDate(recurrenceRule);
          }
        }
        // For quarterly tasks, check if target day is upcoming in current quarter month
        else if (recurrenceRule.pattern === 'quarterly' && recurrenceRule.dayOfMonth) {
          const month = today.getMonth();
          const isQuarterMonth = month === 0 || month === 3 || month === 6 || month === 9;
          
          if (isQuarterMonth) {
            const targetDay = recurrenceRule.dayOfMonth;
            const currentDay = getDate(today);
            const daysInMonth = getDaysInMonth(today);
            const effectiveTargetDay = Math.min(targetDay, daysInMonth);
            
            if (currentDay <= effectiveTargetDay) {
              newTask.dueDate = format(
                new Date(today.getFullYear(), today.getMonth(), effectiveTargetDay),
                'yyyy-MM-dd'
              );
            } else {
              newTask.dueDate = getNextRecurrenceDate(recurrenceRule);
            }
          } else {
            newTask.dueDate = getNextRecurrenceDate(recurrenceRule);
          }
        }
        // For nth-weekday patterns, find the target date in current scope
        else if (recurrenceRule.pattern === 'nth-weekday' && recurrenceRule.nthWeek && recurrenceRule.weekdays?.length) {
          const targetWeekday = recurrenceRule.weekdays[0];
          const targetN = recurrenceRule.nthWeek;
          const scope = recurrenceRule.scope || 'month';
          
          // Determine scope start and check if we're in a valid scope month
          let scopeStart: Date;
          let isValidScopeMonth = true;
          
          if (scope === 'year') {
            // Yearly: only valid in January
            isValidScopeMonth = today.getMonth() === 0;
            scopeStart = startOfYear(today);
          } else if (scope === 'quarter') {
            // Quarterly: only valid in quarter-start months (Jan, Apr, Jul, Oct)
            const m = today.getMonth();
            isValidScopeMonth = m === 0 || m === 3 || m === 6 || m === 9;
            scopeStart = startOfMonth(today);
          } else {
            // Monthly
            scopeStart = startOfMonth(today);
          }
          
          if (isValidScopeMonth) {
            // Find the nth weekday in current scope
            let count = 0;
            let checkDate = scopeStart;
            let targetDate: Date | null = null;
            
            // Search for up to 35 days (covers any month)
            for (let i = 0; i < 35; i++) {
              if (getDay(checkDate) === targetWeekday) {
                count++;
                if (count === targetN) {
                  targetDate = checkDate;
                  break;
                }
              }
              checkDate = addDays(checkDate, 1);
            }
            
            if (targetDate && targetDate >= today) {
              // Target date is still upcoming in current scope
              newTask.dueDate = format(targetDate, 'yyyy-MM-dd');
            } else {
              // Target date has passed, get next occurrence
              newTask.dueDate = getNextRecurrenceDate(recurrenceRule);
            }
          } else {
            newTask.dueDate = getNextRecurrenceDate(recurrenceRule);
          }
        }
        // For weekly/biweekly/other patterns, use existing logic
        else if (doesRecurringTaskApplyToDate(recurrenceRule, today)) {
          newTask.dueDate = format(today, 'yyyy-MM-dd');
        } else {
          newTask.dueDate = getNextRecurrenceDate(recurrenceRule);
        }
      }
    }

    addTask(newTask);

    // Reset form
    setTitle('');
    setNotes('');
    setPriority('p2');
    setDueDate('');
    setRecurrenceRule(null);
    setLabels([]);
    setTaskType(defaultType);
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setTitle('');
      setIsExpanded(false);
    }
  };

  const priorityColors: Record<Priority, { bg: string; text: string }> = {
    'p0': { bg: 'bg-priority-p0', text: 'text-white' },
    'p1': { bg: 'bg-priority-p1', text: 'text-white' },
    'p2': { bg: 'bg-priority-p2', text: 'text-white' },
    'p3': { bg: 'bg-priority-p3', text: 'text-gray-200' },
    'p4': { bg: 'bg-priority-p4', text: 'text-gray-300' },
  };

  const getRecurrenceSummary = () => {
    if (!recurrenceRule) return 'Set Pattern';
    return formatRecurrence(recurrenceRule);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-board-border
          text-board-muted hover:text-gray-300 hover:border-board-muted transition-all"
      >
        <Plus size={18} />
        <span className="text-sm">Add switchback...</span>
      </button>
    );
  }

  return (
    <>
      <div ref={containerRef} className="bg-board-surface rounded-lg border border-board-border p-3 animate-fade-in">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
          className="w-full bg-transparent text-white text-sm placeholder-board-muted focus:outline-none"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add description (optional)"
          rows={2}
          className="w-full bg-transparent text-white text-sm placeholder-board-muted focus:outline-none resize-none mt-2"
        />

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-board-border">
          <div className="flex items-center gap-2">
            {/* Type toggle */}
            <div className="flex bg-board-elevated rounded-md">
              <button
                onClick={() => handleTypeChange('one-off')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  taskType === 'one-off' ? 'bg-board-muted/30 text-white' : 'text-board-muted'
                }`}
              >
                One-off
              </button>
              <button
                onClick={() => handleTypeChange('recurring')}
                className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                  taskType === 'recurring' ? 'bg-board-muted/30 text-white' : 'text-board-muted'
                }`}
              >
                <RefreshCw size={10} />
                Recurring
              </button>
            </div>

            {/* Priority selector */}
            <div className="relative">
              <button
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${priorityColors[priority].bg} ${priorityColors[priority].text}`}
              >
                <Flag size={12} />
                {PRIORITY_LABELS[priority]}
              </button>
              {showPriorityMenu && (
                <div className="absolute top-full left-0 mt-1 bg-board-elevated rounded-lg shadow-xl border border-board-border py-1 z-50 min-w-[120px]">
                  {(['p0', 'p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPriority(p);
                        setShowPriorityMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-board-surface flex items-center gap-2`}
                    >
                      <span className={`w-3 h-3 rounded ${priorityColors[p].bg}`}></span>
                      {PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Due date - only for one-off tasks */}
            {taskType === 'one-off' && (
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  min="2026-01-07"
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-board-elevated text-xs text-board-muted px-2 py-1 rounded-md border-none focus:outline-none focus:ring-1 focus:ring-accent-gold"
                />
              </div>
            )}

            {/* Recurrence pattern button (only for recurring tasks) */}
            {taskType === 'recurring' && (
              <button
                onClick={() => setShowRecurrenceModal(true)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  recurrenceRule 
                    ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30' 
                    : 'bg-board-elevated text-board-muted hover:bg-board-border'
                }`}
              >
                <RefreshCw size={12} />
                <span className="max-w-[120px] truncate">{getRecurrenceSummary()}</span>
              </button>
            )}

            {/* Label input */}
            <div className="flex items-center gap-1">
              {labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-board-elevated rounded text-xs text-gray-300 border border-board-border"
                >
                  {label}
                  <button
                    onClick={() => handleRemoveLabel(label)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {showLabelInput ? (
                <input
                  ref={labelInputRef}
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={handleLabelKeyDown}
                  onBlur={handleAddLabel}
                  placeholder="Label..."
                  className="bg-board-elevated text-xs text-white px-2 py-1 rounded border border-board-border focus:outline-none focus:border-accent-gold w-20"
                />
              ) : (
                <button
                  onClick={() => setShowLabelInput(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-board-elevated text-board-muted hover:bg-board-border transition-colors"
                >
                  <Tag size={12} />
                  Label
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTitle('');
                setIsExpanded(false);
              }}
              className="px-3 py-1.5 text-xs text-board-muted hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || (taskType === 'recurring' && !recurrenceRule)}
              className="px-3 py-1.5 text-xs bg-accent-gold text-black rounded-md hover:bg-accent-warm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Switchback
            </button>
          </div>
        </div>
      </div>

      {/* Recurrence Modal */}
      <RecurrenceModal
        isOpen={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
        onSave={(rule) => setRecurrenceRule(rule)}
        initialRule={recurrenceRule}
      />
    </>
  );
}
