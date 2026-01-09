import { 
  Calendar, 
  CalendarDays,
  List, 
  ChevronRight,
  Trees,
} from 'lucide-react';
import { ViewType } from '../App';
import { useTaskStore } from '../stores/taskStore';
import { getTodayViewTasks } from '../utils/sorting';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  accentColor?: string;
}

function NavItem({ icon, label, count, isActive, onClick, accentColor }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
        transition-all duration-200 group text-left
        ${isActive 
          ? 'bg-board-elevated text-white border border-board-border' 
          : 'text-board-muted hover:bg-board-surface hover:text-gray-200'
        }
      `}
    >
      <span className={`flex-shrink-0 ${isActive ? accentColor || 'text-accent-gold' : ''}`}>
        {icon}
      </span>
      <span className="flex-1 font-medium text-sm">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`
          text-xs px-2 py-0.5 rounded-full
          ${isActive 
            ? 'bg-accent-gold/20 text-accent-gold' 
            : 'bg-board-elevated text-board-muted'
          }
        `}>
          {count}
        </span>
      )}
      <ChevronRight 
        size={14} 
        className={`
          opacity-0 group-hover:opacity-100 transition-opacity
          ${isActive ? 'text-accent-gold' : 'text-board-muted'}
        `} 
      />
    </button>
  );
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { tasks } = useTaskStore();
  const todayTasks = getTodayViewTasks(tasks);
  
  const todayCount = todayTasks.overdue.length + todayTasks.today.length;

  return (
    <aside className="w-60 h-full bg-board-bg border-r border-board-border flex flex-col">
      {/* Header - Afterglow branding */}
      <div className="px-4 py-5 border-b border-board-border">
        <h1 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
          <Trees size={20} className="text-accent-gold" />
          <span>Afterglow</span>
        </h1>
        <p className="text-xs text-board-muted mt-1">Walk through your day</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <NavItem
          icon={<Calendar size={18} />}
          label="Today"
          count={todayCount}
          isActive={currentView === 'today'}
          onClick={() => onViewChange('today')}
          accentColor="text-accent-warm"
        />
        <NavItem
          icon={<CalendarDays size={18} />}
          label="Week"
          isActive={currentView === 'week'}
          onClick={() => onViewChange('week')}
        />
        <NavItem
          icon={<List size={18} />}
          label="Canopy"
          count={tasks.filter(t => t.status !== 'done').length}
          isActive={currentView === 'all'}
          onClick={() => onViewChange('all')}
        />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-board-border">
        <div className="flex items-center gap-2 text-xs text-board-muted">
          <span className="w-2 h-2 rounded-full bg-status-active/50"></span>
          {tasks.filter(t => t.status === 'done').length} switchbacks completed
        </div>
      </div>
    </aside>
  );
}
