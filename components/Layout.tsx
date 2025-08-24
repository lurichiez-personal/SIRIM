
import React, { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { TaskStatusContainer } from './ui/TaskStatus';
import CommandPalette from './ui/CommandPalette';
import { useCommandPaletteStore } from '../stores/useCommandPaletteStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { open } = useCommandPaletteStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);


  return (
    <div className="flex h-screen bg-secondary-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary-100 p-6 lg:p-8">
          {children}
        </main>
      </div>
      <TaskStatusContainer />
      <CommandPalette />
    </div>
  );
};

export default Layout;
