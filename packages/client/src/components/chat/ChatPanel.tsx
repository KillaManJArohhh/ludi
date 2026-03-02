import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@ludi/shared';
import QuickMessages from './QuickMessages.js';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string, isPreset: boolean) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatPanel({ messages, onSend, isOpen, onToggle }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed, false);
    setInput('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full btn-primary
                   text-white flex items-center justify-center shadow-lg z-40"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px]
                           flex items-center justify-center font-bold">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-80 h-96 glass-panel border-l border-t border-[#C4A35A]/10
                    rounded-tl-xl flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#C4A35A]/10">
        <span className="text-sm font-semibold text-[#f0ece4]">Chat</span>
        <button onClick={onToggle} className="text-[#C4A35A]/40 hover:text-[#C4A35A]/70 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(msg => (
          <div key={msg.id}>
            <span className="text-xs font-semibold text-[#009B3A]">{msg.playerName}: </span>
            <span className={`text-xs ${msg.isPreset ? 'text-[#FED100]/70 italic' : 'text-[#f0ece4]/60'}`}>
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      {/* Quick messages */}
      <QuickMessages onSelect={(text) => onSend(text, true)} />

      {/* Input */}
      <div className="flex gap-2 p-2 border-t border-[#C4A35A]/10">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 bg-white/[0.04] rounded px-3 py-1.5 text-xs text-[#f0ece4] outline-none
                     placeholder:text-[#C4A35A]/20 focus:ring-1 focus:ring-[#C4A35A]/30
                     border border-white/[0.06]"
        />
        <button
          onClick={handleSend}
          className="px-3 py-1.5 rounded btn-primary text-white text-xs font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}
