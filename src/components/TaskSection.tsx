import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Task } from '../types/task';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '../stores/taskStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  icon?: React.ReactNode;
  accentColor?: string;
  defaultCollapsed?: boolean;
  showCount?: boolean;
  hideComplete?: boolean;
  showNextDue?: boolean;
  onEdit?: (task: Task) => void;
}

export function TaskSection({ 
  title, 
  tasks, 
  icon,
  accentColor = 'text-gray-400',
  defaultCollapsed = false,
  showCount = true,
  hideComplete = false,
  showNextDue = false,
  onEdit,
}: TaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const { reorderTasks, tasks: allTasks } = useTaskStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder within section
        const reorderedSectionTasks = [...tasks];
        const [movedTask] = reorderedSectionTasks.splice(oldIndex, 1);
        reorderedSectionTasks.splice(newIndex, 0, movedTask);

        // Merge back with all tasks
        const otherTasks = allTasks.filter(t => !tasks.find(st => st.id === t.id));
        const newAllTasks = [...otherTasks, ...reorderedSectionTasks];
        
        reorderTasks(newAllTasks);
      }
    }
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 mb-3 group"
      >
        <span className="text-board-muted group-hover:text-gray-400 transition-colors">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
        {icon && <span className={accentColor}>{icon}</span>}
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${accentColor}`}>
          {title}
        </h2>
        {showCount && (
          <span className="text-xs text-board-muted bg-board-elevated px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        )}
      </button>

      {!isCollapsed && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 animate-slide-down">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} hideComplete={hideComplete} showNextDue={showNextDue} onEdit={onEdit} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

