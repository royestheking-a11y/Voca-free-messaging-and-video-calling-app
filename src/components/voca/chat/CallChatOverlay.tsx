import React, { useState, useRef, useEffect } from 'react';
import { useVoca } from '../VocaContext';
import { useSocket } from '../SocketContext';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ScrollArea } from '../../ui/scroll-area';
import { Send, X, ArrowDown } from 'lucide-react';
import { cn } from '../../ui/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface CallChatOverlayProps {
    participantId: string;
    onClose: () => void;
}

export const CallChatOverlay = ({ participantId, onClose }: CallChatOverlayProps) => {
    const { chats, currentUser, sendMessage, activeChatId } = useVoca();
    const { sendMessage: emitSocketMessage } = useSocket();
    const [inputText, setInputText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    // Find the chat with this participant
    // Note: activeChatId might be set to the chat we started the call from, 
    // but in case we are in a call from listing, we should find the chat dynamically if possible.
    // However, usually `createChat` or `setActiveChatId` happened before call.
    // Let's try to find chat by participantId first.
    const chat = chats.find(c =>
        !c.isGroup && c.participants.some(p => p.id === participantId)
    );

    const chatId = chat?.id;
    const messages = chat?.messages || [];

    // Scroll to bottom effect
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, chatId]); // Scroll on new message

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !chatId) return;

        const content = inputText;
        setInputText('');

        try {
            const message = await sendMessage(chatId, content, 'text');
            if (message) {
                emitSocketMessage(participantId, chatId, message);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Show scroll down button if we are not at bottom
        setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 100);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 bottom-24 right-4 w-80 md:w-96 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl z-50"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                <h3 className="text-white font-medium">In-Call Chat</h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Messages Area */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
                ref={scrollRef}
                onScroll={handleScroll}
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/40 text-sm italic">
                        <p>No messages yet</p>
                        <p>Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === (currentUser?.id || 'me');
                        return (
                            <div key={msg.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm relative group",
                                    isMe
                                        ? "bg-emerald-600 text-white rounded-br-none"
                                        : "bg-white/10 text-white border border-white/10 rounded-bl-none"
                                )}>
                                    {!isMe && chat?.isGroup && (
                                        <p className="text-[10px] text-white/60 mb-0.5 font-medium">
                                            {/* Name lookup logic simplified */}
                                            Sender
                                        </p>
                                    )}
                                    {msg.type === 'image' ? (
                                        <div className="mb-1 rounded-lg overflow-hidden">
                                            <img src={msg.mediaUrl} alt="Image" className="max-w-full h-auto object-cover" />
                                        </div>
                                    ) : msg.type === 'voice' ? (
                                        <div className="flex items-center gap-2 italic text-white/80">
                                            <span>🎤 Voice Message</span>
                                            <span className="text-[10px] bg-black/20 px-1 rounded">{msg.duration}</span>
                                        </div>
                                    ) : (
                                        <p className="break-words leading-relaxed">{msg.content}</p>
                                    )}
                                    <span className={cn(
                                        "text-[10px] block text-right mt-0.5 opacity-60",
                                        isMe ? "text-emerald-100" : "text-gray-300"
                                    )}>
                                        {format(new Date(msg.timestamp), 'h:mm a')}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Scroll to Bottom Button */}
            <AnimatePresence>
                {showScrollBottom && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
                        className="absolute bottom-20 left-1/2 -translate-x-1/2 p-2 bg-black/80 text-white rounded-full border border-white/20 shadow-lg z-10"
                    >
                        <ArrowDown className="w-4 h-4" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/10 flex items-center gap-2">
                <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/10 border-none text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-emerald-500/50 rounded-full h-10"
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={!inputText.trim()}
                    className={cn(
                        "h-10 w-10 rounded-full transition-all duration-300",
                        inputText.trim() ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-white/10 text-white/30"
                    )}
                >
                    <Send className="w-5 h-5 ml-0.5" />
                </Button>
            </form>
        </motion.div>
    );
};
