export interface SuggestedActivity {
  type: 'breathing' | 'reflection' | 'affirmation' | 'selfcare';
  title: string;
  reason: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  role?: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  suggestedActivity?: SuggestedActivity | null;
  createdAt: string;
  status?: 'sending' | 'streaming' | 'sent' | 'error';
}

export interface Conversation {
  id: string;
  title: string | null;
  summary: string | null;
  lastMessage?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: {
    id: string;
    role: 'USER' | 'ASSISTANT' | 'SYSTEM';
    content: string;
    suggestedActivity?: SuggestedActivity | null;
    createdAt: string;
  }[];
}

export interface StarterPrompt {
  id: string;
  text: string;
  emoji: string;
}
