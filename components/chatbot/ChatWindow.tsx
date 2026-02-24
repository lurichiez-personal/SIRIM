import React, { useState, useRef, useEffect } from 'react';
import { useChatbotStore } from '../../stores/useChatbotStore';
import { HelenAvatarIcon } from '../icons/Icons';
import Button from '../ui/Button';

const ChatWindow: React.FC = () => {
  const { isOpen, messages, isLoading, sendMessage } = useChatbotStore();
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      sendMessage(userInput);
      setUserInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[99] w-full max-w-sm h-[60vh] bg-white rounded-lg shadow-2xl flex flex-col border border-secondary-200">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-secondary-50 rounded-t-lg">
        <HelenAvatarIcon className="h-10 w-10 mr-3" />
        <div>
          <h3 className="font-bold text-secondary-800">Helen</h3>
          <p className="text-xs text-secondary-500">Asistente Inteligente SIRIM</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'helen' && <HelenAvatarIcon className="h-6 w-6 flex-shrink-0" />}
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.sender === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-secondary-100 text-secondary-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-end gap-2">
            <HelenAvatarIcon className="h-6 w-6 flex-shrink-0" />
            <div className="bg-secondary-100 text-secondary-800 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center space-x-1">
                    <span className="h-2 w-2 bg-secondary-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-secondary-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-secondary-400 rounded-full animate-bounce"></span>
                </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t bg-secondary-50 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Haz una pregunta..."
            className="flex-1 px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            Enviar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;