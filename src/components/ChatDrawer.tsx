import React, { useState } from 'react';
import { X, ArrowUp } from 'lucide-react';
import { ChatMessage } from '../data/seedData';
import { soundEffects } from '../utils/audio';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (channel: ChatMessage['channel'], text: string) => void;
  soundEnabled: boolean;
  activeRole: string;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  soundEnabled,
  activeRole,
}) => {
  const [activeChannel, setActiveChannel] = useState<ChatMessage['channel']>('umum');
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const channels: { id: ChatMessage['channel']; label: string }[] = [
    { id: 'umum', label: 'Umum' },
    { id: 'waiter-antar', label: 'Waiter & Antar' },
    { id: 'dapur', label: 'Dapur' },
    { id: 'kasir', label: 'Kasir' },
  ];

  const quickPhrases = [
    'Order meja 3 tolong dicek ya',
    'Pesanan sudah siap di meja pickup',
    'Minta tolong refill es batu & tisu',
    'Bill meja 2 siap dibayar',
  ];

  const filteredMessages = messages.filter(
    (m) => m.channel === activeChannel || m.channel === 'umum'
  );

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    if (soundEnabled) soundEffects.tap();
    onSendMessage(activeChannel, text.trim());
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
      <div className="bg-white border-l border-[#E5E5EA] w-full max-w-sm h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* iOS Header */}
        <div className="p-4 border-b border-[#F2F2F7] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#1C1C1E]">Pesan Tim Internal</h3>
            <p className="text-[11px] text-[#8E8E93]">Saluran: #{activeChannel}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#F2F2F7] text-[#636366] hover:text-[#1C1C1E] flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Channel Segmented Control */}
        <div className="p-2 bg-[#F2F2F7] border-b border-[#E5E5EA]">
          <div className="bg-[#E5E5EA] p-1 rounded-xl flex items-center gap-1 overflow-x-auto no-scrollbar">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`flex-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeChannel === ch.id
                    ? 'bg-white text-[#1C1C1E] font-semibold shadow-xs'
                    : 'text-[#636366] hover:text-[#1C1C1E]'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="p-2 border-b border-[#F2F2F7] flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-white">
          {quickPhrases.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(phrase)}
              className="px-2.5 py-1 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] text-[11px] whitespace-nowrap transition-colors"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Messages List (iMessage Bubbles) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FCFCFD]">
          {filteredMessages.length === 0 ? (
            <div className="text-center text-[#8E8E93] py-12 text-xs">
              Belum ada pesan di saluran ini.
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.role === activeRole;

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1 text-[10px] text-[#8E8E93] mb-0.5 px-1">
                    <span className="font-medium text-[#1C1C1E]">{msg.sender}</span>
                    <span>·</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-[#007AFF] text-white rounded-br-xs'
                        : 'bg-[#E5E5EA] text-[#1C1C1E] rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar (iMessage Bar) */}
        <div className="p-3 border-t border-[#F2F2F7] bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pesan iMessage..."
              className="flex-1 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full px-4 py-2 text-xs text-[#1C1C1E] placeholder-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-8 h-8 rounded-full bg-[#007AFF] hover:bg-[#0062CC] disabled:opacity-30 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
