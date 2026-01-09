import { useState, useRef, useEffect } from 'react';
import { 
  MoreHorizontal, 
  RefreshCw, 
  Check,
  Trash2,
  Edit3,
  Plus,
  X,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight,
  StopCircle,
  AlertTriangle,
} from 'lucide-react';
import { Task, Priority, TaskStatus, STATUS_LABELS, PRIORITY_LABELS } from '../types/task';
import { useTaskStore } from '../stores/taskStore';
import { formatRecurrence, getNextRecurrenceDate } from '../utils/recurrence';
import { format, parseISO } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RecurrenceModal } from './RecurrenceModal';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  hideComplete?: boolean;
  showNextDue?: boolean; // Show next due date inline (for All Tasks view)
}

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  'p0': { bg: 'bg-priority-p0', text: 'text-white' },
  'p1': { bg: 'bg-priority-p1', text: 'text-white' },
  'p2': { bg: 'bg-priority-p2', text: 'text-white' },
  'p3': { bg: 'bg-priority-p3', text: 'text-gray-200' },
  'p4': { bg: 'bg-priority-p4', text: 'text-gray-300' },
};

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  'not-started': { bg: 'bg-board-muted/20', text: 'text-board-muted' },
  'in-progress': { bg: 'bg-status-active/20', text: 'text-status-active' },
  'waiting': { bg: 'bg-status-waiting/20', text: 'text-status-waiting' },
  'needs-review': { bg: 'bg-status-review/20', text: 'text-status-review' },
  'blocked': { bg: 'bg-status-blocked/20', text: 'text-status-blocked' },
  'someday': { bg: 'bg-board-muted/20', text: 'text-board-muted' },
  'done': { bg: 'bg-status-active/20', text: 'text-status-active' },
};

export function TaskCard({ task, isDragging: externalDragging, hideComplete = false, showNextDue = false }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState(task.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  
  const { updateTask, deleteTask, completeTask, endTask } = useTaskStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (showLabelInput && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [showLabelInput]);

  useEffect(() => {
    if (showDatePicker && dateInputRef.current) {
      dateInputRef.current.focus();
      dateInputRef.current.showPicker?.();
    }
  }, [showDatePicker]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setShowPriorityMenu(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isExpanded && notesRef.current) {
      notesRef.current.focus();
    }
  }, [isExpanded]);

  // Sync notes state with task.notes when task changes
  useEffect(() => {
    setNotes(task.notes || '');
  }, [task.notes]);

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      updateTask(task.id, { title: editTitle.trim() });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  const handlePriorityChange = (priority: Priority) => {
    updateTask(task.id, { priority });
    setShowPriorityMenu(false);
  };

  const handleStatusChange = (status: TaskStatus) => {
    if (status === 'done') {
      completeTask(task.id);
    } else {
      updateTask(task.id, { status });
    }
    setShowStatusMenu(false);
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    completeTask(task.id);
  };

  const handleAddLabel = () => {
    if (newLabel.trim()) {
      const currentLabels = task.labels || [];
      if (!currentLabels.includes(newLabel.trim())) {
        updateTask(task.id, { labels: [...currentLabels, newLabel.trim()] });
      }
      setNewLabel('');
      setShowLabelInput(false);
    }
  };

  const handleRemoveLabel = (labelToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentLabels = task.labels || [];
    updateTask(task.id, { labels: currentLabels.filter(l => l !== labelToRemove) });
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

  const [pendingDate, setPendingDate] = useState(task.dueDate || '');
  
  const handleDateSubmit = () => {
    updateTask(task.id, { dueDate: pendingDate || undefined });
    setShowDatePicker(false);
  };

  const handleRecurrenceSave = (rule: typeof task.recurrence) => {
    updateTask(task.id, { recurrence: rule });
  };

  const handleSaveNotes = () => {
    if (notes !== task.notes) {
      updateTask(task.id, { notes: notes || undefined });
    }
  };

  const handleToggleExpand = () => {
    if (!isEditing) {
      setIsExpanded(!isExpanded);
    }
  };

  const actualDragging = isDragging || externalDragging;
  const hasNotes = task.notes && task.notes.trim().length > 0;
  const priorityColor = PRIORITY_COLORS[task.priority];
  const statusColor = STATUS_COLORS[task.status];

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`
          group relative bg-board-surface rounded-lg border border-board-border
          transition-all duration-200
          ${actualDragging ? 'opacity-50 shadow-lg scale-[1.02]' : 'hover:border-board-muted'}
        `}
      >
        <div className="px-3 py-2.5">
          {/* Main task row */}
          <div className="flex items-center gap-2">
            {/* Complete button - hidden in All Tasks view */}
            {!hideComplete && (
              <button
                onClick={handleComplete}
                className={`
                  flex-shrink-0 w-5 h-5 rounded-full border-2
                  transition-all duration-200
                  ${task.status === 'in-progress' 
                    ? 'border-status-active bg-status-active/20' 
                    : 'border-board-muted hover:border-accent-gold hover:bg-accent-gold/10'
                  }
                `}
              >
                <Check 
                  size={12} 
                  className="m-auto opacity-0 group-hover:opacity-100 text-accent-gold transition-opacity" 
                />
              </button>
            )}

            {/* Expand/collapse indicator */}
            <button
              onClick={handleToggleExpand}
              className="flex-shrink-0 p-0.5 text-board-muted hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* Title */}
            <div className="flex-1 min-w-0" {...attributes} {...listeners}>
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  className="w-full text-sm text-white bg-board-elevated px-2 py-1 rounded border border-board-border focus:outline-none focus:border-accent-gold"
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <p 
                    className="text-sm text-gray-200 cursor-pointer truncate hover:text-white"
                    onClick={handleToggleExpand}
                    onDoubleClick={() => setIsEditing(true)}
                  >
                    {task.title}
                  </p>
                  {hasNotes && !isExpanded && (
                    <FileText size={12} className="flex-shrink-0 text-board-muted" title="Has notes" />
                  )}
                </div>
              )}
            </div>

            {/* Inline badges row */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Priority badge - clickable */}
              <div className="relative" ref={priorityRef}>
                <button
                  onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor.bg} ${priorityColor.text} hover:opacity-80 transition-opacity`}
                >
                  {task.priority.toUpperCase()}
                </button>
                {showPriorityMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-board-elevated rounded-lg shadow-xl border border-board-border py-1 z-50 min-w-[100px]">
                    {(['p0', 'p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => handlePriorityChange(p)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-board-surface flex items-center gap-2 ${
                          task.priority === p ? 'text-accent-gold' : 'text-gray-300'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded ${PRIORITY_COLORS[p].bg}`}></span>
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status badge - clickable */}
              <div className="relative" ref={statusRef}>
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={`px-2 py-0.5 rounded text-xs ${statusColor.bg} ${statusColor.text} hover:opacity-80 transition-opacity`}
                >
                  {STATUS_LABELS[task.status]}
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-board-elevated rounded-lg shadow-xl border border-board-border py-1 z-50 min-w-[120px]">
                    {(['not-started', 'in-progress', 'waiting', 'needs-review', 'blocked', 'done'] as TaskStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-board-surface ${
                          task.status === status ? 'text-accent-gold' : 'text-gray-300'
                        }`}
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Labels - as pills */}
              {task.labels && task.labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-gold/10 text-accent-gold rounded text-xs"
                >
                  {label}
                  <button
                    onClick={(e) => handleRemoveLabel(label, e)}
                    className="hover:text-red-400"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}

              {/* Add label button */}
              {showLabelInput ? (
                <input
                  ref={labelInputRef}
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={handleLabelKeyDown}
                  onBlur={() => {
                    handleAddLabel();
                    setShowLabelInput(false);
                  }}
                  placeholder="Label"
                  className="w-16 bg-board-elevated text-xs text-white px-2 py-0.5 rounded border border-board-border focus:outline-none focus:border-accent-gold"
                />
              ) : (
                <button
                  onClick={() => setShowLabelInput(true)}
                  className="p-0.5 rounded text-board-muted hover:text-accent-gold hover:bg-board-elevated transition-colors"
                  title="Add label"
                >
                  <Plus size={14} />
                </button>
              )}

              {/* Date display - one-off tasks show date picker, recurring tasks show next due in All Tasks view */}
              {task.type === 'one-off' ? (
                <div className="relative">
                  {showDatePicker && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowDatePicker(false)}
                    />
                  )}
                  {showDatePicker ? (
                    <div className="relative z-50 flex items-center gap-1">
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={pendingDate}
                        min="2026-01-07"
                        onChange={(e) => setPendingDate(e.target.value)}
                        className="w-28 bg-board-elevated text-xs text-white px-2 py-0.5 rounded border border-board-border focus:outline-none focus:border-accent-gold"
                      />
                      <button
                        onClick={handleDateSubmit}
                        className="px-2 py-0.5 bg-accent-gold text-black rounded text-xs font-medium hover:bg-accent-warm transition-colors"
                      >
                        Go
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setPendingDate(task.dueDate || '');
                        setShowDatePicker(true);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-board-elevated text-board-muted hover:text-white transition-colors"
                    >
                      <Calendar size={12} />
                      {task.dueDate ? format(parseISO(task.dueDate), 'MM/dd/yyyy') : 'Set date'}
                    </button>
                  )}
                </div>
              ) : showNextDue && task.recurrence && (
                // Show next due date inline only in All Tasks view
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-board-elevated text-board-muted">
                  <RefreshCw size={12} />
                  {task.dueDate ? format(parseISO(task.dueDate), 'MM/dd') : 'No date'}
                </span>
              )}

              {/* Actions menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded hover:bg-board-elevated transition-all text-board-muted hover:text-white"
                >
                  <MoreHorizontal size={16} />
                </button>

                {showMenu && !showDeleteConfirm && !showEndConfirm && (
                  <div className="absolute right-0 top-full mt-1 bg-board-elevated rounded-lg shadow-xl border border-board-border py-1 z-50 min-w-[140px] animate-fade-in">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-board-surface"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    
                    {/* End Task - only for recurring tasks */}
                    {task.type === 'recurring' && (
                      <button
                        onClick={() => setShowEndConfirm(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-accent-amber hover:bg-board-surface"
                      >
                        <StopCircle size={14} />
                        End Task
                      </button>
                    )}
                    
                    <hr className="border-board-border my-1" />
                    
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-board-surface"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}

                {/* Delete Confirmation */}
                {showMenu && showDeleteConfirm && (
                  <div className="absolute right-0 top-full mt-1 bg-board-elevated rounded-lg shadow-xl border border-board-border p-3 z-50 min-w-[200px] animate-fade-in">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">Delete task?</span>
                    </div>
                    <p className="text-xs text-board-muted mb-3">This action cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setShowMenu(false);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs text-gray-300 bg-board-surface rounded hover:bg-board-border transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          deleteTask(task.id);
                          setShowDeleteConfirm(false);
                          setShowMenu(false);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* End Task Confirmation */}
                {showMenu && showEndConfirm && (
                  <div className="absolute right-0 top-full mt-1 bg-board-elevated rounded-lg shadow-xl border border-board-border p-3 z-50 min-w-[220px] animate-fade-in">
                    <div className="flex items-center gap-2 text-accent-amber mb-2">
                      <StopCircle size={16} />
                      <span className="text-sm font-medium">End recurring task?</span>
                    </div>
                    <p className="text-xs text-board-muted mb-3">
                      This task will stop appearing after today but remain visible on past days.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowEndConfirm(false);
                          setShowMenu(false);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs text-gray-300 bg-board-surface rounded hover:bg-board-border transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          endTask(task.id);
                          setShowEndConfirm(false);
                          setShowMenu(false);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs text-white bg-accent-amber rounded hover:bg-accent-gold transition-colors"
                      >
                        End Task
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expandable details section */}
          {isExpanded && (
            <div className="mt-3 ml-7 space-y-3 animate-slide-down">
              {/* Recurrence info for recurring tasks */}
              {task.type === 'recurring' && task.recurrence && (
                <div className="flex items-center gap-4 text-sm">
                  <button
                    onClick={() => setShowRecurrenceModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-board-elevated text-board-muted hover:text-white border border-board-border hover:border-accent-gold transition-colors"
                  >
                    <RefreshCw size={14} />
                    <span>{formatRecurrence(task.recurrence)}</span>
                  </button>
                  {task.dueDate && (
                    <span className="text-board-muted text-xs">
                      Next: <span className="text-gray-300">{format(parseISO(task.dueDate), 'MMM d, yyyy')}</span>
                    </span>
                  )}
                </div>
              )}
              
              {/* Notes textarea */}
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Add notes or description..."
                className="w-full min-h-[80px] bg-board-elevated text-sm text-gray-300 p-3 rounded-lg border border-board-border focus:outline-none focus:border-accent-gold resize-y placeholder-board-muted"
              />
            </div>
          )}
        </div>
      </div>

      {/* Recurrence Modal for editing recurring tasks */}
      <RecurrenceModal
        isOpen={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
        onSave={handleRecurrenceSave}
        initialRule={task.recurrence}
      />
    </>
  );
}
