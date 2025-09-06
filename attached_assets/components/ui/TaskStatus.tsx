
import React from 'react';
import { useTaskStore, Task } from '../../stores/useTaskStore';

const TaskStatusIndicator: React.FC<{ task: Task }> = ({ task }) => {
    const getIcon = () => {
        switch (task.status) {
            case 'processing':
                return (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                );
            case 'completed':
                return (
                    <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'error':
                 return (
                    <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };
    
    const getBgColor = () => {
        switch (task.status) {
            case 'processing': return 'bg-blue-500';
            case 'completed': return 'bg-green-500';
            case 'error': return 'bg-red-500';
        }
    }

    return (
        <div className={`flex items-center p-4 rounded-lg shadow-lg text-white ${getBgColor()} transition-all duration-300`}>
            <div className="mr-3 flex-shrink-0">{getIcon()}</div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{task.name}</p>
                {task.status === 'processing' && (
                    <div className="w-full bg-black bg-opacity-20 rounded-full h-1.5 mt-2">
                        <div className="bg-white h-1.5 rounded-full" style={{ width: `${task.progress}%` }}></div>
                    </div>
                )}
                {task.message && <p className="text-xs mt-1">{task.message}</p>}
            </div>
        </div>
    );
};


export const TaskStatusContainer: React.FC = () => {
    const { tasks } = useTaskStore();

    if (tasks.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-[100] w-full max-w-sm space-y-3">
            {tasks.map(task => (
                <TaskStatusIndicator key={task.id} task={task} />
            ))}
        </div>
    );
};