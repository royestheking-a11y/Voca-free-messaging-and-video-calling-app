import React from 'react';
import { useVoca } from '../VocaContext';
import { MessageBubble } from './MessageBubble';
import { Button } from '../../ui/button';
import { ArrowLeft, Star, Trash2 } from 'lucide-react';
import { ScrollArea } from '../../ui/scroll-area';
import { format } from 'date-fns';

interface StarredMessagesViewProps {
  onClose: () => void;
}

export const StarredMessagesView = ({ onClose }: StarredMessagesViewProps) => {
  const { getStarredMessages, currentUser, starMessage, setActiveChatId } = useVoca();
  const starred = getStarredMessages();

  const handleMessageClick = (chatId: string) => {
    setActiveChatId(chatId);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-[var(--wa-app-bg)] flex flex-col animate-in slide-in-from-left duration-300">
      <div className="h-16 bg-[var(--wa-header-bg)] px-4 flex items-center gap-4 shrink-0 text-[var(--wa-text-primary)] shadow-sm border-b border-[var(--wa-border)]">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-[var(--wa-hover)]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-medium">Starred Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {starred.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--wa-text-secondary)] p-10 text-center">
            <div className="w-32 h-32 bg-[var(--wa-header-bg)] rounded-full flex items-center justify-center mb-6">
              <Star className="w-16 h-16 opacity-30 fill-current" />
            </div>
            <p className="text-lg font-medium text-[var(--wa-text-primary)] mb-2">No starred messages</p>
            <p className="text-sm max-w-xs">Tap and hold on any message in a chat to star it, so you can easily find it later.</p>
          </div>
        ) : (
          <div className="flex flex-col pb-4">
            {starred.map(({ message, chat }) => {
              const otherParticipant = chat.isGroup ? null : chat.participants.find(p => p.id !== currentUser?.id);
              const sender = chat.participants.find(p => p.id === message.senderId);
              const title = message.senderId === currentUser?.id ? "You" : (sender?.name || "Unknown");
              const chatTitle = chat.isGroup ? chat.name : (otherParticipant?.name || "Chat");

              return (
                <div
                  key={message.id}
                  className="border-b border-[var(--wa-border)] hover:bg-[var(--wa-hover)] transition-colors cursor-pointer group"
                  onClick={() => handleMessageClick(chat.id)}
                >
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[var(--wa-text-secondary)]">
                      {chat.isGroup ? (
                        <>
                          <span className="font-medium text-[var(--wa-text-primary)]">{title}</span>
                          <span className="text-[10px]">•</span>
                          <span>{chatTitle}</span>
                        </>
                      ) : (
                        <span>{title}</span>
                      )}
                      <span className="text-[10px]">•</span>
                      <span>{format(new Date(message.timestamp), 'M/d/yy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-[var(--wa-text-secondary)] hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          starMessage(chat.id, message.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="px-4 pb-4 pl-8 pointer-events-none">
                    <MessageBubble message={message} isMe={message.senderId === currentUser?.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
