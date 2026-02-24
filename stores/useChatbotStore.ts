import { create } from 'zustand';
import { useDataStore } from './useDataStore.ts';

interface ChatMessage {
  sender: 'user' | 'helen';
  text: string;
}

interface ChatbotState {
  isOpen: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  toggle: () => void;
  sendMessage: (userMessage: string) => Promise<void>;
}

export const useChatbotStore = create<ChatbotState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  messages: [
    {
      sender: 'helen',
      text: '¡Hola! Soy Helen, tu asistente de contabilidad. ¿En qué puedo ayudarte hoy?',
    },
  ],
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  sendMessage: async (userMessage: string) => {
    if (get().isLoading || !userMessage.trim()) return;

    // Add user message to the chat
    set((state) => ({
      isLoading: true,
      messages: [...state.messages, { sender: 'user', text: userMessage }],
    }));

    try {
      // Call the AI function from the data store
      const answer = await useDataStore.getState().answerQuestionWithAI(userMessage);

      // Add Helen's response to the chat
      set((state) => ({
        messages: [...state.messages, { sender: 'helen', text: answer }],
      }));
    } catch (error) {
      console.error("Error getting response from Helen:", error);
      set((state) => ({
        messages: [
          ...state.messages,
          { sender: 'helen', text: 'Lo siento, tuve un problema para procesar tu solicitud. Por favor, intenta de nuevo.' },
        ],
      }));
    } finally {
      set({ isLoading: false });
    }
  },
}));
