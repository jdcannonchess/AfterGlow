import { useState, useRef, useEffect } from 'react';
import { X, Flag, RefreshCw, Tag, Clock } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { Task, Priority, TaskType, RecurrenceRule, PRIORITY_LABELS } from '../types/task';
import { format, getDate, getDaysInMonth, getDay, startOfMonth, startOfYear, addDays } from 'date-fns';
import { RecurrenceModal } from './RecurrenceModal';
import { WeekHoursPreview } from './WeekHoursPreview';
import { formatRecurrence, doesRecurringTaskApplyToDate, getNextRecurrenceDate } from '../utils/recurrence';
import { formatMinutesToTime } from '../utils/time';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTask?: Task | null;  // Task to edit, if provided modal is in edit mode
}

export function CreateTaskModal({ isOpen, onClose, editTask }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('p2');
  const [taskType, setTaskType] = useState<TaskType>('one-off');
  const [dueDate, setDueDate] = useState('');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const { addTask, editTaskAction } = useTaskStore();
  
  const isEditMode = !!editTask;

  // Pre-fill form when editing a task
  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setPriority(editTask.priority);
      setTaskType(editTask.type);
      setDueDate(editTask.dueDate || '');
      setRecurrenceRule(editTask.recurrence || null);
      setLabels(editTask.labels || []);
      setNotes(editTask.notes || '');
      setEstimatedMinutes(editTask.estimatedMinutes?.toString() || '');
    }
  }, [editTask]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Focus label input when it shows
  useEffect(() => {
    if (showLabelInput && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [showLabelInput]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showRecurrenceModal) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showRecurrenceModal, onClose]);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setPriority('p2');
    setDueDate('');
    setRecurrenceRule(null);
    setLabels([]);
    setTaskType('one-off');
    setEstimatedMinutes('');
    setShowPriorityMenu(false);
    setShowLabelInput(false);
    setNewLabel('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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
    if (type === 'recurring') {
      setShowRecurrenceModal(true);
      setDueDate(''); // Clear due date when switching to recurring
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const taskData: Partial<Task> = {
      title: title.trim(),
      type: taskType,
      priority,
      dueDate: dueDate || undefined,
      labels: labels.length > 0 ? labels : undefined,
      notes: notes.trim() || undefined,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined,
    };

    if (taskType === 'recurring' && recurrenceRule) {
      taskData.recurrence = recurrenceRule;
      if (!dueDate) {
        const today = new Date();
        
        // For monthly tasks, check if target day is still upcoming this month
        if (recurrenceRule.pattern === 'monthly' && recurrenceRule.dayOfMonth) {
          const targetDay = recurrenceRule.dayOfMonth;
          const currentDay = getDate(today);
          const daysInMonth = getDaysInMonth(today);
          const effectiveTargetDay = Math.min(targetDay, daysInMonth);
          
          if (currentDay <= effectiveTargetDay) {
            taskData.dueDate = format(
              new Date(today.getFullYear(), today.getMonth(), effectiveTargetDay),
              'yyyy-MM-dd'
            );
          } else {
            taskData.dueDate = getNextRecurrenceDate(recurrenceRule);
          }
        }
        // For quarterly tasks
        else if (recurrenceRule.pattern === 'quarterly' && recurrenceRule.dayOfMonth) {
          const month = today.getMonth();
          const isQuarterMonth = month === 0 || month === 3 || month === 6 || month === 9;
          
          if (isQuarterMonth) {
            const targetDay = recurrenceRule.dayOfMonth;
            const currentDay = getDate(today);
            const daysInMonth = getDaysInMonth(today);
            const effectiveTargetDay = Math.min(targetDay, daysInMonth);
            
            if (currentDay <= effectiveTargetDay) {
              taskData.dueDate = format(
                new Date(today.getFullYear(), today.getMonth(), effectiveTargetDay),
                'yyyy-MM-dd'
              );
            } else {
              taskData.dueDate = getNextRecurrenceDate(recurrenceRule);
            }
          } else {
            taskData.dueDate = getNextRecurrenceDate(recurrenceRule);
          }
        }
        // For nth-weekday patterns
        else if (recurrenceRule.pattern === 'nth-weekday' && recurrenceRule.nthWeek && recurrenceRule.weekdays?.length) {
          const targetWeekday = recurrenceRule.weekdays[0];
          const targetN = recurrenceRule.nthWeek;
          const scope = recurrenceRule.scope || 'month';
          
          let scopeStart: Date;
          let isValidScopeMonth = true;
          
          if (scope === 'year') {
            isValidScopeMonth = today.getMonth() === 0;
            scopeStart = startOfYear(today);
          } else if (scope === 'quarter') {
            const m = today.getMonth();
            isValidScopeMonth = m === 0 || m === 3 || m === 6 || m === 9;
            scopeStart = startOfMonth(today);
          } else {
            scopeStart = startOfMonth(today);
          }
          
          if (isValidScopeMonth) {
            let count = 0;
            let checkDate = scopeStart;
            let targetDate: Date | null = null;
            
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
              taskData.dueDate = format(targetDate, 'yyyy-MM-dd');
            } else {
              taskData.dueDate = getNextRecurrenceDate(recurrenceRule);
            }
          } else {
            taskData.dueDate = getNextRecurrenceDate(recurrenceRule);
          }
        }
        // For weekly/biweekly/other patterns
        else if (doesRecurringTaskApplyToDate(recurrenceRule, today)) {
          taskData.dueDate = format(today, 'yyyy-MM-dd');
        } else {
          taskData.dueDate = getNextRecurrenceDate(recurrenceRule);
        }
      }
    } else if (taskType === 'one-off') {
      // Clear recurrence for one-off tasks
      taskData.recurrence = undefined;
    }

    if (isEditMode && editTask) {
      // Edit existing task
      editTaskAction(editTask.id, taskData, editTask);
    } else {
      // Create new task
      addTask(taskData);
    }
    handleClose();
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        />
        
        {/* Modal - wider to accommodate side panel */}
        <div 
          className="relative bg-board-surface border border-board-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-board-border">
            <h2 className="text-lg font-medium text-white">
              {isEditMode ? 'Edit Switchback' : 'Create New Task'}
            </h2>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-board-elevated transition-colors"
            >
              <X size={18} className="text-board-muted" />
            </button>
          </div>

          {/* Content - Two column layout */}
          <div className="flex">
            {/* Left column - Form fields */}
            <div className="flex-1 p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm text-board-muted mb-1.5">Title *</label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full bg-board-elevated text-white text-sm px-3 py-2 rounded-lg border border-board-border 
                    focus:outline-none focus:border-accent-gold placeholder-board-muted"
                />
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-sm text-board-muted mb-1.5">Task Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTypeChange('one-off')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                      taskType === 'one-off'
                        ? 'bg-accent-gold/20 border-accent-gold text-accent-gold'
                        : 'bg-board-elevated border-board-border text-gray-300 hover:border-board-muted'
                    }`}
                  >
                    One-off
                  </button>
                  <button
                    onClick={() => handleTypeChange('recurring')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                      taskType === 'recurring'
                        ? 'bg-accent-gold/20 border-accent-gold text-accent-gold'
                        : 'bg-board-elevated border-board-border text-gray-300 hover:border-board-muted'
                    }`}
                  >
                    <RefreshCw size={14} />
                    Recurring
                  </button>
                </div>
                
                {/* Due Date - only for one-off tasks */}
                {taskType === 'one-off' && (
                  <div className="mt-2">
                    <input
                      type="date"
                      value={dueDate}
                      min="2026-01-07"
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-board-elevated text-white text-sm px-3 py-2 rounded-lg border border-board-border 
                        focus:outline-none focus:border-accent-gold"
                    />
                  </div>
                )}

                {/* Recurrence pattern button - only for recurring tasks */}
                {taskType === 'recurring' && (
                  <button
                    onClick={() => setShowRecurrenceModal(true)}
                    className={`mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      recurrenceRule 
                        ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30' 
                        : 'bg-board-elevated text-board-muted border border-board-border hover:border-board-muted'
                    }`}
                  >
                    <RefreshCw size={14} />
                    <span>{getRecurrenceSummary()}</span>
                  </button>
                )}
              </div>

              {/* Time Estimate */}
              <div>
                <label className="block text-sm text-board-muted mb-1.5">Time Estimate</label>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border ${
                    estimatedMinutes ? 'bg-accent-gold/10 border-accent-gold/30' : 'bg-board-elevated border-board-border'
                  }`}>
                    <Clock size={14} className={estimatedMinutes ? 'text-accent-gold' : 'text-board-muted'} />
                    <input
                      type="number"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(e.target.value)}
                      placeholder="Minutes"
                      min="1"
                      className="flex-1 bg-transparent text-sm text-white placeholder-board-muted focus:outline-none"
                    />
                  </div>
                  {estimatedMinutes && parseInt(estimatedMinutes, 10) > 0 && (
                    <span className="text-sm text-accent-gold whitespace-nowrap">
                      = {formatMinutesToTime(parseInt(estimatedMinutes, 10))}
                    </span>
                  )}
                </div>
              </div>

              {/* Priority + Labels - same row */}
              <div className="flex gap-3">
                {/* Priority */}
                <div className="flex-1">
                  <label className="block text-sm text-board-muted mb-1.5">Priority</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-board-border w-full justify-between
                        bg-board-elevated hover:border-board-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded ${priorityColors[priority].bg}`}></span>
                        <Flag size={14} className={priorityColors[priority].text} />
                        <span className="text-white text-xs">{PRIORITY_LABELS[priority]}</span>
                      </div>
                      <span className="text-board-muted text-xs">▼</span>
                    </button>
                    {showPriorityMenu && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-board-elevated rounded-lg shadow-xl border border-board-border py-1 z-50">
                        {(['p0', 'p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setPriority(p);
                              setShowPriorityMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-board-surface flex items-center gap-2 ${
                              priority === p ? 'bg-board-surface' : ''
                            }`}
                          >
                            <span className={`w-3 h-3 rounded ${priorityColors[p].bg}`}></span>
                            {PRIORITY_LABELS[p]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Labels */}
                <div className="flex-1">
                  <label className="block text-sm text-board-muted mb-1.5">Labels</label>
                  <div className="flex flex-wrap items-center gap-1 min-h-[38px] px-2 py-1 bg-board-elevated rounded-lg border border-board-border">
                    {labels.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-board-surface rounded text-xs text-gray-300"
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
                        className="bg-transparent text-xs text-white placeholder-board-muted focus:outline-none w-16"
                      />
                    ) : (
                      <button
                        onClick={() => setShowLabelInput(true)}
                        className="flex items-center gap-1 text-xs text-board-muted hover:text-gray-300 transition-colors"
                      >
                        <Tag size={10} />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-board-muted mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add description or notes (optional)"
                  rows={2}
                  className="w-full bg-board-elevated text-white text-sm px-3 py-2 rounded-lg border border-board-border 
                    focus:outline-none focus:border-accent-gold placeholder-board-muted resize-none"
                />
              </div>
            </div>

            {/* Right column - Week Hours Preview */}
            <div className="w-48 border-l border-board-border bg-board-elevated/50 p-4">
              <WeekHoursPreview />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-board-border">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-board-muted hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || (taskType === 'recurring' && !recurrenceRule)}
              className="px-4 py-2 text-sm bg-accent-gold text-black rounded-lg hover:bg-accent-warm transition-colors 
                disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isEditMode ? 'Save Changes' : 'Create Task'}
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
