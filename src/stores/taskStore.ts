import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskData, TaskStatus } from '../types/task';
import { invoke } from '@tauri-apps/api/core';
import { getNextRecurrenceDate } from '../utils/recurrence';

interface TaskStore {
  tasks: Task[];
  labels: string[];
  stakeholders: string[];
  isLoading: boolean;
  error: string | null;
  selectedDate: Date | null;

  // Actions
  loadTasks: () => Promise<void>;
  saveTasks: () => Promise<void>;
  
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  uncompleteTask: (id: string) => void;
  endTask: (id: string) => void;
  reorderTasks: (tasks: Task[]) => void;
  
  addLabel: (label: string) => void;
  removeLabel: (label: string) => void;
  addStakeholder: (stakeholder: string) => void;
  removeStakeholder: (stakeholder: string) => void;
  
  setSelectedDate: (date: Date | null) => void;
}

// Check if we're running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Local storage fallback for development
const LOCAL_STORAGE_KEY = 'daily-command-board-data';

const loadFromLocalStorage = (): TaskData => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return { tasks: [], labels: [], stakeholders: [] };
};

const saveToLocalStorage = (data: TaskData) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  labels: [],
  stakeholders: [],
  isLoading: true,
  error: null,
  selectedDate: null,

  loadTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      let data: TaskData;
      
      if (isTauri()) {
        data = await invoke<TaskData>('load_tasks');
      } else {
        data = loadFromLocalStorage();
      }
      
      set({ 
        tasks: data.tasks || [], 
        labels: data.labels || [], 
        stakeholders: data.stakeholders || [],
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  saveTasks: async () => {
    const { tasks, labels, stakeholders } = get();
    const data: TaskData = { tasks, labels, stakeholders };
    
    try {
      if (isTauri()) {
        await invoke('save_tasks', { data });
      } else {
        saveToLocalStorage(data);
      }
    } catch (error) {
      console.error('Failed to save tasks:', error);
      set({ error: String(error) });
    }
  },

  addTask: (taskData: Partial<Task>) => {
    const { tasks } = get();
    const maxSortOrder = tasks.reduce((max, t) => Math.max(max, t.sortOrder), 0);
    
    const newTask: Task = {
      id: uuidv4(),
      title: taskData.title || 'New Task',
      type: taskData.type || 'one-off',
      priority: taskData.priority || 'p2',
      status: taskData.status || 'not-started',
      createdAt: new Date().toISOString(),
      sortOrder: maxSortOrder + 1,
      ...taskData,
    };

    set({ tasks: [...tasks, newTask] });
    get().saveTasks();
  },

  updateTask: (id: string, updates: Partial<Task>) => {
    const { tasks } = get();
    const updatedTasks = tasks.map(task =>
      task.id === id ? { ...task, ...updates } : task
    );
    set({ tasks: updatedTasks });
    get().saveTasks();
  },

  deleteTask: (id: string) => {
    const { tasks } = get();
    set({ tasks: tasks.filter(task => task.id !== id) });
    get().saveTasks();
  },

  completeTask: (id: string) => {
    const { tasks } = get();
    const task = tasks.find(t => t.id === id);
    
    if (!task) return;

    const completedAt = new Date().toISOString();
    let updatedTasks = tasks.map(t =>
      t.id === id ? { ...t, status: 'done' as TaskStatus, completedAt } : t
    );

    // If it's a recurring task, create the next instance
    if (task.type === 'recurring' && task.recurrence) {
      const nextDueDate = getNextRecurrenceDate(task.recurrence, task.dueDate);
      
      if (nextDueDate) {
        const maxSortOrder = tasks.reduce((max, t) => Math.max(max, t.sortOrder), 0);
        const nextTask: Task = {
          id: uuidv4(),
          title: task.title,
          type: 'recurring',
          priority: task.priority,
          status: 'not-started',
          createdAt: new Date().toISOString(),
          dueDate: nextDueDate,
          notes: task.notes,
          stakeholders: task.stakeholders,
          labels: task.labels,
          recurrence: task.recurrence,
          parentRecurringId: task.parentRecurringId || task.id,
          sortOrder: maxSortOrder + 1,
          estimatedMinutes: task.estimatedMinutes, // Preserve time estimate for recurring tasks
        };
        updatedTasks = [...updatedTasks, nextTask];
      }
    }

    set({ tasks: updatedTasks });
    get().saveTasks();
  },

  uncompleteTask: (id: string) => {
    const { tasks } = get();
    const updatedTasks = tasks.map(task =>
      task.id === id 
        ? { ...task, status: 'not-started' as TaskStatus, completedAt: undefined } 
        : task
    );
    set({ tasks: updatedTasks });
    get().saveTasks();
  },

  endTask: (id: string) => {
    const { tasks } = get();
    const endedAt = new Date().toISOString().split('T')[0]; // Just the date part (YYYY-MM-DD)
    const updatedTasks = tasks.map(task =>
      task.id === id 
        ? { ...task, endedAt } 
        : task
    );
    set({ tasks: updatedTasks });
    get().saveTasks();
  },

  reorderTasks: (newTasks: Task[]) => {
    // Update sortOrder based on new positions
    const reorderedTasks = newTasks.map((task, index) => ({
      ...task,
      sortOrder: index,
    }));
    set({ tasks: reorderedTasks });
    get().saveTasks();
  },

  addLabel: (label: string) => {
    const { labels } = get();
    if (!labels.includes(label)) {
      set({ labels: [...labels, label] });
      get().saveTasks();
    }
  },

  removeLabel: (label: string) => {
    const { labels, tasks } = get();
    set({ 
      labels: labels.filter(l => l !== label),
      tasks: tasks.map(t => ({
        ...t,
        labels: t.labels?.filter(l => l !== label)
      }))
    });
    get().saveTasks();
  },

  addStakeholder: (stakeholder: string) => {
    const { stakeholders } = get();
    if (!stakeholders.includes(stakeholder)) {
      set({ stakeholders: [...stakeholders, stakeholder] });
      get().saveTasks();
    }
  },

  removeStakeholder: (stakeholder: string) => {
    const { stakeholders, tasks } = get();
    set({ 
      stakeholders: stakeholders.filter(s => s !== stakeholder),
      tasks: tasks.map(t => ({
        ...t,
        stakeholders: t.stakeholders?.filter(s => s !== stakeholder)
      }))
    });
    get().saveTasks();
  },

  setSelectedDate: (date: Date | null) => {
    set({ selectedDate: date });
  },
}));

