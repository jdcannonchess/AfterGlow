import { useState, useMemo } from 'react';
import { List, Search, ChevronDown, Check } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { sortTasks, sortByCreatedAt, sortByLabels } from '../utils/sorting';
import { TaskSection } from './TaskSection';
import { Task, RecurrencePattern } from '../types/task';

type SortOption = 'created' | 'priority' | 'labels';
type FilterType = 'all' | 'one-off' | RecurrencePattern;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created', label: 'Created' },
  { value: 'priority', label: 'Priority' },
  { value: 'labels', label: 'Labels' },
];

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'one-off', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'business-days', label: 'Business Days' },
  { value: 'nth-weekday', label: 'Nth Weekday' },
];

function Dropdown<T extends string>({ 
  value, 
  options, 
  onChange,
  label 
}: { 
  value: T; 
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-board-surface border border-board-border rounded-lg hover:border-board-muted transition-colors"
      >
        <span className="text-board-muted text-xs">{label}:</span>
        <span className="text-white">{selected?.label}</span>
        <ChevronDown size={14} className="text-board-muted" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-board-elevated border border-board-border rounded-lg shadow-xl py-1 min-w-[140px]">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-board-surface transition-colors ${
                  value === option.value ? 'text-accent-gold' : 'text-white'
                }`}
              >
                {value === option.value && <Check size={14} />}
                <span className={value === option.value ? '' : 'ml-5'}>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface AllTasksViewProps {
  onEdit?: (task: Task) => void;
}

export function AllTasksView({ onEdit }: AllTasksViewProps) {
  const { tasks } = useTaskStore();
  
  // Control state
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Apply filters and sorting
  const displayedTasks = useMemo(() => {
    let filtered: Task[] = [...tasks];

    // Filter by completed status
    if (!showCompleted) {
      filtered = filtered.filter(t => t.status !== 'done');
    }

    // Filter by recurrence type
    if (filterType !== 'all') {
      if (filterType === 'one-off') {
        filtered = filtered.filter(t => t.type === 'one-off');
      } else {
        filtered = filtered.filter(t => 
          t.type === 'recurring' && t.recurrence?.pattern === filterType
        );
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.labels?.some(l => l.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'created':
        return sortByCreatedAt(filtered);
      case 'priority':
        return sortTasks(filtered);
      case 'labels':
        return sortByLabels(filtered);
      default:
        return filtered;
    }
  }, [tasks, sortBy, filterType, showCompleted, searchQuery]);

  const activeTasks = displayedTasks.filter(t => t.status !== 'done');
  const completedTasks = displayedTasks.filter(t => t.status === 'done');
  const totalActive = tasks.filter(t => t.status !== 'done').length;
  const totalCompleted = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="h-full flex flex-col bg-board-bg">
      {/* Header */}
      <header className="px-8 py-6 border-b border-board-border">
        <div className="flex items-center gap-3">
          <List size={24} className="text-accent-gold" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Canopy</h1>
            <p className="text-sm text-board-muted mt-1">
              {totalActive} active • {totalCompleted} completed
            </p>
          </div>
        </div>
      </header>

      {/* Control Bar */}
      <div className="px-8 py-4 border-b border-board-border flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-board-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search switchbacks..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-board-surface border border-board-border rounded-lg text-white placeholder-board-muted focus:outline-none focus:border-accent-gold transition-colors"
          />
        </div>

        {/* Sort Dropdown */}
        <Dropdown
          value={sortBy}
          options={SORT_OPTIONS}
          onChange={setSortBy}
          label="Sort"
        />

        {/* Filter Dropdown */}
        <Dropdown
          value={filterType}
          options={FILTER_OPTIONS}
          onChange={setFilterType}
          label="Type"
        />

        {/* Show Completed Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div 
            className={`w-9 h-5 rounded-full transition-colors relative ${
              showCompleted ? 'bg-accent-gold' : 'bg-board-surface border border-board-border'
            }`}
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <div 
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                showCompleted ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </div>
          <span className="text-sm text-board-muted">Show completed</span>
        </label>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Results summary when filtered */}
        {(searchQuery || filterType !== 'all') && (
          <p className="text-xs text-board-muted mb-4">
            Showing {displayedTasks.length} of {tasks.length} switchbacks
          </p>
        )}

        {displayedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-board-elevated flex items-center justify-center mb-4">
              <List size={32} className="text-board-muted" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">
              {searchQuery || filterType !== 'all' ? 'No matching switchbacks' : 'No switchbacks yet'}
            </h2>
            <p className="text-board-muted text-sm max-w-sm">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your filters or search query.'
                : 'Click the + button to add your first switchback.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTasks.length > 0 && (
              <TaskSection
                title="Active Switchbacks"
                tasks={activeTasks}
                showCount={true}
                hideComplete={true}
                showNextDue={true}
                onEdit={onEdit}
              />
            )}
            
            {showCompleted && completedTasks.length > 0 && (
              <TaskSection
                title="Completed Switchbacks"
                tasks={completedTasks}
                showCount={true}
                hideComplete={false}
                defaultCollapsed={true}
                onEdit={onEdit}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
