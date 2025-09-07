
import { create } from 'zustand';

type TaskStatus = 'processing' | 'completed' | 'error';

export interface Task {
  id: string;
  name: string;
  progress: number; // 0 to 100
  status: TaskStatus;
  message?: string;
}

interface TaskState {
  tasks: Task[];
  addTask: (id: string, name: string) => void;
  updateTaskProgress: (id: string, progress: number) => void;
  completeTask: (id: string, message?: string) => void;
  failTask: (id: string, message: string) => void;
  clearCompletedTasks: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  addTask: (id, name) => {
    set(state => ({
      tasks: [...state.tasks, { id, name, progress: 0, status: 'processing' }],
    }));
  },
  updateTaskProgress: (id, progress) => {
    set(state => ({
      tasks: state.tasks.map(task =>
        task.id === id ? { ...task, progress: Math.min(100, Math.max(0, progress)) } : task
      ),
    }));
  },
  completeTask: (id, message = 'Completed successfully!') => {
    set(state => ({
      tasks: state.tasks.map(task =>
        task.id === id ? { ...task, progress: 100, status: 'completed', message } : task
      ),
    }));
    // Auto-clear completed tasks after a delay
    setTimeout(() => {
        const task = get().tasks.find(t => t.id === id);
        if (task && task.status === 'completed') {
            set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
        }
    }, 5000);
  },
  failTask: (id, message) => {
    set(state => ({
      tasks: state.tasks.map(task =>
        task.id === id ? { ...task, status: 'error', message } : task
      ),
    }));
     // Auto-clear error tasks after a delay
     setTimeout(() => {
        const task = get().tasks.find(t => t.id === id);
        if (task && task.status === 'error') {
            set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
        }
    }, 8000);
  },
  clearCompletedTasks: () => {
      set(state => ({
          tasks: state.tasks.filter(task => task.status !== 'completed'),
      }));
  }
}));