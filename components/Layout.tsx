import React, { useEffect } from 'react';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import { TaskStatusContainer } from './ui/TaskStatus.tsx';
import CommandPalette from './ui/CommandPalette.tsx';
import { useCommandPaletteStore } from '../stores/useCommandPaletteStore.ts';
import AlertModal from './ui/AlertModal.tsx';
import ConfirmationModal from './ui/ConfirmationModal.tsx';
import { useUIStore } from '../stores/useUIStore.ts';
import ChatbotFAB from './chatbot/ChatbotFAB.tsx';
import ChatWindow from './chatbot/ChatWindow.tsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { open } = useCommandPaletteStore();
  const { isSidebarOpen, closeSidebar } = useUIStore();

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
    <div className="relative flex h-screen bg-secondary-100 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary-100 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30" 
          onClick={closeSidebar}
          aria-hidden="true"
        ></div>
      )}
      <TaskStatusContainer />
      <CommandPalette />
      <AlertModal />
      <ConfirmationModal />
      <ChatbotFAB />
      <ChatWindow />
    </div>
  );
};

export default Layout;