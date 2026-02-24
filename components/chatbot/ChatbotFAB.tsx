import React from 'react';
import { useChatbotStore } from '../../stores/useChatbotStore';
import { ChatBubbleOvalLeftEllipsisIcon, XMarkIcon } from '../icons/Icons';

const ChatbotFAB: React.FC = () => {
  const { isOpen, toggle } = useChatbotStore();

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 right-6 z-[100] h-16 w-16 rounded-full bg-primary text-white shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-transform transform hover:scale-110"
      aria-label="Abrir asistente de chat"
    >
      {isOpen ? (
        <XMarkIcon className="h-8 w-8 mx-auto" />
      ) : (
        <ChatBubbleOvalLeftEllipsisIcon className="h-8 w-8 mx-auto" />
      )}
    </button>
  );
};

export default ChatbotFAB;