import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../../lib/data';
import { cn } from '../../ui/utils';
import { Avatar } from '../../ui/avatar';
import { format } from 'date-fns';
import { Check, CheckCheck, FileText, Download, ChevronDown, Trash2, Star, Reply, Ban, Play, Pause, Edit2, Video, Phone } from 'lucide-react';
import { Button } from '../../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { useVoca } from '../VocaContext';
import { useSocket } from '../SocketContext';

interface MessageBubbleProps {
    message: Message;
    isMe: boolean;
    onReply?: () => void;
    onImageClick?: (url: string) => void;
    onEdit?: () => void;
}

export const MessageBubble = ({ message, isMe, onReply, onImageClick, onEdit }: MessageBubbleProps) => {
    const { deleteMessage, starMessage, activeChatId, currentUser, chats } = useVoca();
    const { emitDeleteMessage, emitStarMessage } = useSocket();
    const [isPlaying, setIsPlaying] = useState(false);

    // Helper to emit delete event if needed
    const handleDeleteForEveryone = () => {
        deleteMessage(activeChatId!, message.id, true);
        const activeChat = chats.find(c => c.id === activeChatId);
        const otherParticipant = activeChat?.participants.find(p => p.id !== currentUser?.id);
        if (otherParticipant) {
            emitDeleteMessage(activeChatId!, message.id, otherParticipant.id, true);
        }
    };

    // Helper for Star
    const handleStar = () => {
        starMessage(activeChatId!, message.id);
        const activeChat = chats.find(c => c.id === activeChatId);
        const otherParticipant = activeChat?.participants.find(p => p.id !== currentUser?.id);
        if (otherParticipant) {
            emitStarMessage(activeChatId!, message.id, otherParticipant.id);
        }
    };


    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const isImage = message.type === 'image';
    const isDoc = message.type === 'doc';
    const isVoice = message.type === 'voice';
    const isVideo = message.type === 'video';

    // Check if message is deleted for me
    const isDeletedForMe = message.deletedFor?.includes(currentUser?.id || 'me');

    // Find reply message if exists
    const activeChat = chats.find(c => c.id === activeChatId);
    const replyMessage = message.replyToId && activeChat ? activeChat.messages.find(m => m.id === message.replyToId) : null;
    const replySender = replyMessage && activeChat ? activeChat.participants.find(p => p.id === replyMessage.senderId) : null;
    const replySenderName = replySender ? (replySender.id === currentUser?.id ? "You" : replySender.name) : "Unknown";

    // Check if editable (within 10 minutes)
    const isEditable = isMe && !message.isDeleted && message.type === 'text' &&
        (new Date().getTime() - new Date(message.timestamp).getTime() < 10 * 60 * 1000);

    // Handle Audio Playback
    useEffect(() => {
        if (isVoice && message.mediaUrl) {
            const audio = new Audio(message.mediaUrl);
            audioRef.current = audio;

            const handleEnded = () => {
                setIsPlaying(false);
                setProgress(0);
            };

            const handleTimeUpdate = () => {
                if (audio.duration) {
                    setProgress((audio.currentTime / audio.duration) * 100);
                }
            };

            audio.addEventListener('ended', handleEnded);
            audio.addEventListener('timeupdate', handleTimeUpdate);

            return () => {
                audio.pause();
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.src = ""; // Clean up source to stop downloading
            };
        }
    }, [isVoice, message.mediaUrl]);

    const togglePlayback = async () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            try {
                setIsPlaying(true);
                await audioRef.current.play();
            } catch (error) {
                // Ignore AbortError which happens when pausing quickly after playing
                if ((error as Error).name !== 'AbortError') {
                    console.error("Audio playback error:", error);
                    setIsPlaying(false);
                }
            }
        }
    };

    if (message.isDeleted || isDeletedForMe) {
        return (
            <div className={cn("flex w-full mb-1", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                    "px-3 py-2 rounded-lg max-w-[85%] md:max-w-[65%] text-sm italic flex items-center gap-2 text-[var(--wa-text-secondary)]",
                    isMe ? "bg-[var(--wa-outgoing-bg)] rounded-tr-none" : "bg-[var(--wa-incoming-bg)] rounded-tl-none"
                )}>
                    <Ban className="w-4 h-4" />
                    This message was deleted
                </div>
            </div>
        );
    }

    // ... inside MessageBubble component

    // Premium 3D Call Icon Components
    const CallIcon3D = ({ type, status }: { type: 'voice' | 'video', status: 'missed' | 'incoming' | 'outgoing' | 'cancelled' }) => {
        const isVideo = type === 'video';
        const isMissed = status === 'missed' || status === 'cancelled';

        // Gradients
        const greenGradient = "url(#green-gradient)";
        const redGradient = "url(#red-gradient)";
        const blueGradient = "url(#blue-gradient)";

        return (
            <div className="relative w-10 h-10 flex items-center justify-center">
                <svg width="0" height="0">
                    <defs>
                        <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#4ade80" />
                            <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                        <linearGradient id="red-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f87171" />
                            <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                        <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                </svg>

                {/* 3D Container with shadow */}
                <div
                    className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform transition-transform border border-white/10",
                        isMissed ? "bg-red-500/10 shadow-red-500/20" : "bg-emerald-500/10 shadow-emerald-500/20"
                    )}
                >
                    {isVideo ? (
                        <Video
                            className="w-5 h-5 drop-shadow-md"
                            style={{ stroke: isMissed ? "url(#red-gradient)" : "url(#green-gradient)", strokeWidth: 2.5 }}
                        />
                    ) : (
                        /* Phone Icon with tilt based on status */
                        <Phone
                            className={cn("w-5 h-5 drop-shadow-md", isMissed ? "rotate-[135deg]" : "rotate-0")}
                            style={{ stroke: isMissed ? "url(#red-gradient)" : "url(#green-gradient)", strokeWidth: 2.5 }}
                        />
                    )}

                    {/* Status Indicator (Arrow) */}
                    <div className="absolute -bottom-1 -right-1 bg-[var(--wa-panel-bg)] rounded-full p-0.5 border border-[var(--wa-border)] shadow-sm">
                        {status === 'outgoing' && <div className="w-2.5 h-2.5 bg-green-500 rounded-full" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />}
                        {status === 'incoming' && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" style={{ clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)' }} />}
                        {status === 'missed' && <div className="w-2.5 h-2.5 bg-red-500 rounded-full" style={{ clipPath: 'polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)' }} />}
                    </div>
                </div>
            </div>
        );
    };

    if (message.type === 'call') {
        // Parse content to determine state
        const text = message.content.toLowerCase();
        const isVideo = text.includes('video');
        const isMissed = text.includes('missed') || text.includes('cancelled');
        const isIncoming = text.includes('incoming');

        let status: 'missed' | 'incoming' | 'outgoing' | 'cancelled' = 'outgoing';
        if (text.includes('missed')) status = 'missed';
        else if (text.includes('cancelled')) status = 'cancelled';
        else if (text.includes('incoming')) status = 'incoming';

        return (
            <div className={cn("flex w-full mb-3 justify-center")}>
                <div className="bg-[var(--wa-panel-bg)]/80 backdrop-blur-md border border-[var(--wa-border)] shadow-sm rounded-2xl p-3 flex items-center gap-4 min-w-[200px] max-w-[85%] select-none hover:bg-[var(--wa-hover)] transition-colors cursor-pointer group/call">

                    <CallIcon3D type={isVideo ? 'video' : 'voice'} status={status} />

                    <div className="flex flex-col">
                        <span className={cn(
                            "text-sm font-semibold tracking-wide",
                            isMissed ? "text-red-500" : "text-[var(--wa-text-primary)]"
                        )}>
                            {status === 'missed' ? 'Missed Call' :
                                status === 'cancelled' ? 'Cancelled Call' :
                                    status === 'incoming' ? 'Incoming Call' : 'Outgoing Call'}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-[var(--wa-text-secondary)]">
                            <span>{format(new Date(message.timestamp), 'h:mm a')}</span>
                            {message.duration && message.duration !== '0:00' && (
                                <>
                                    <span>•</span>
                                    <span>{message.duration}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ... rest of the component (return logic for other types)
    return (
        <div id={`message-${message.id}`} className={cn("flex w-full mb-1 group/bubble", isMe ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[85%] md:max-w-[65%] rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative flex flex-col",
                    isMe ? "bg-[var(--wa-outgoing-bg)] rounded-tr-none" : "bg-[var(--wa-incoming-bg)] rounded-tl-none"
                )}
            >
                {/* Dropdown Menu Arrow (Visible on Hover) */}
                <div className="absolute top-0 right-0 z-20 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-bl-lg bg-gradient-to-l from-black/40 to-transparent hover:bg-black/20 text-white/80">
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)]">
                            <DropdownMenuItem className="focus:bg-[var(--wa-hover)] cursor-pointer" onClick={onReply}>
                                <Reply className="w-4 h-4 mr-2" /> Reply
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-[var(--wa-hover)] cursor-pointer" onClick={handleStar}>
                                <Star className={cn("w-4 h-4 mr-2", message.isStarred && "fill-yellow-400 text-yellow-400")} />
                                {message.isStarred ? 'Unstar' : 'Star'}
                            </DropdownMenuItem>
                            {isEditable && (
                                <DropdownMenuItem className="focus:bg-[var(--wa-hover)] cursor-pointer" onClick={onEdit}>
                                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="focus:bg-[var(--wa-hover)] cursor-pointer text-red-400" onClick={() => deleteMessage(activeChatId!, message.id, false)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete for me
                            </DropdownMenuItem>
                            {isMe && (
                                <DropdownMenuItem className="focus:bg-[var(--wa-hover)] cursor-pointer text-red-400" onClick={handleDeleteForEveryone}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete for everyone
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Content */}
                <div className={cn("p-1 relative", (isImage || isDoc || isVoice) ? "pb-1" : "px-2 pt-1.5 pb-2")}>

                    {/* Replied Message Display */}
                    {replyMessage && !message.isDeleted && (
                        <div
                            className="bg-black/10 dark:bg-black/20 rounded-md p-1.5 mb-1 flex border-l-4 border-[var(--wa-primary)] cursor-pointer"
                            onClick={() => {
                                const el = document.getElementById(`message-${replyMessage.id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                        >
                            <div className="flex flex-col text-xs overflow-hidden">
                                <span className="text-[var(--wa-primary)] font-medium mb-0.5">{replySenderName}</span>
                                <span className="text-[var(--wa-text-primary)]/80 truncate">
                                    {replyMessage.type === 'image' ? '📷 Photo' : replyMessage.type === 'doc' ? '📄 Document' : replyMessage.type === 'voice' ? '🎤 Voice Message' : replyMessage.content}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Image Handling */}
                    {isImage && (
                        <div className="mb-1 rounded-md overflow-hidden bg-black/10 min-w-[200px] min-h-[150px] relative group/image">
                            {message.isUploading && (
                                <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center backdrop-blur-[2px] transition-all duration-200">
                                    <div className="relative flex items-center justify-center">
                                        <svg className="animate-spin w-12 h-12 text-[#00a884]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                </div>
                            )}
                            {message.mediaUrl ? (
                                <>
                                    <img
                                        src={message.mediaUrl}
                                        alt="Attached"
                                        className={cn("max-h-[300px] w-full object-cover cursor-pointer hover:opacity-95 transition-opacity", message.isUploading && "blur-[1px]")}
                                        onClick={() => onImageClick?.(message.mediaUrl!)}
                                    />
                                    <a
                                        href={message.mediaUrl}
                                        download={`voca-image-${message.id}.jpg`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-black/70"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </>
                            ) : (
                                <div className="h-40 w-full flex items-center justify-center bg-gray-800 text-gray-500 text-xs">
                                    Image Unavailable
                                </div>
                            )}
                        </div>
                    )}

                    {/* Video Handling */}
                    {isVideo && (
                        <div className="mb-1 rounded-md overflow-hidden bg-black/10 min-w-[200px] max-w-[300px] relative group/video">
                            {message.isUploading && (
                                <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center backdrop-blur-[2px] transition-all duration-200">
                                    <div className="relative flex items-center justify-center">
                                        <svg className="animate-spin w-12 h-12 text-[#00a884]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                </div>
                            )}
                            {message.mediaUrl ? (
                                <>
                                    <video
                                        src={message.mediaUrl}
                                        className={cn("max-h-[300px] w-full object-cover cursor-pointer", message.isUploading && "blur-[1px]")}
                                        onClick={() => onImageClick?.(message.mediaUrl!)}
                                        controls={false} // Hide default controls for custom look or use lightbox
                                        muted
                                        preload="metadata"
                                    />
                                    {/* Play Overlay */}
                                    <div
                                        className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer hover:bg-black/10 transition-colors"
                                        onClick={() => onImageClick?.(message.mediaUrl!)}
                                    >
                                        <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                                            <Play className="w-5 h-5 text-white ml-0.5 fill-current" />
                                        </div>
                                    </div>

                                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5 text-white text-[10px] font-medium backdrop-blur-sm">
                                        <Video className="w-3 h-3" />
                                        <span>Video</span>
                                    </div>

                                    <a
                                        href={message.mediaUrl}
                                        download={`voca-video-${message.id}.mp4`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white opacity-0 group-hover/video:opacity-100 transition-opacity hover:bg-black/70"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </>
                            ) : (
                                <div className="h-40 w-full flex items-center justify-center bg-gray-800 text-gray-500 text-xs">
                                    Video Unavailable
                                </div>
                            )}
                        </div>
                    )}

                    {/* Document Handling */}
                    {isDoc && (
                        <div className="flex items-center gap-3 bg-black/5 p-3 rounded-md mb-1 min-w-[240px]">
                            <div className="w-10 h-10 bg-[var(--wa-header-bg)] rounded-lg flex items-center justify-center text-red-400">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--wa-text-primary)] truncate">{message.fileName || "Document.pdf"}</p>
                                <p className="text-xs text-[var(--wa-text-secondary)]">2.4 MB • PDF</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-black/5">
                                <Download className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* Voice Note Handling - Enhanced UI */}
                    {isVoice && (
                        <div className="flex items-center gap-3 bg-transparent p-2 pr-4 rounded-md mb-1 min-w-[240px]">
                            <div className="relative cursor-pointer" onClick={togglePlayback}>
                                <Avatar className="w-12 h-12">
                                    <div className="w-full h-full bg-[#f0f2f5] flex items-center justify-center text-[#54656f] hover:bg-[#e2e5e9] transition-colors">
                                        {isPlaying ? <Pause className="w-5 h-5 ml-0.5 fill-current" /> : <Play className="w-5 h-5 ml-1 fill-current" />}
                                    </div>
                                </Avatar>
                                {/* Mic Icon Overlay */}
                                <div className={cn(
                                    "absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-sm",
                                    isMe ? "bg-[var(--wa-outgoing-bg)] text-[#53bdeb]" : "bg-[var(--wa-incoming-bg)] text-[#53bdeb]"
                                )}>
                                    <div className="w-4 h-4 flex items-center justify-center">
                                        {/* SVG Mic */}
                                        <svg viewBox="0 0 16 20" height="10px" width="10px" className="fill-current"><path d="M8 0a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3zm0 15a5.005 5.005 0 0 0 4.9-4h1.1a6 6 0 1 1-12 0h1.1a5.005 5.005 0 0 0 4.9 4zm0 1a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1z"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-1.5 justify-center py-1">
                                <div className="w-full h-10 flex items-center gap-0.5">
                                    {/* Playback Waveform */}
                                    {Array.from({ length: 30 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-[2px] rounded-full transition-all duration-300",
                                                i / 30 * 100 < progress ? "bg-[var(--wa-text-primary)]/90" : "bg-[var(--wa-text-primary)]/30",
                                                isPlaying && i === Math.floor((progress / 100) * 30) ? "h-[80%]" : ""
                                            )}
                                            style={{ height: `${Math.max(20, Math.random() * 100)}%` }}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-[var(--wa-text-primary)]/80 font-mono flex justify-between">
                                    <span>{message.duration || "0:05"}</span>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Text Content */}
                    {message.content && !isVoice && (
                        <div className={cn(
                            "text-sm sm:text-[14.2px] leading-[19px] break-words text-[var(--wa-text-primary)] px-1 pb-1", // Added pb-1 for spacing above metadata
                            isImage && "pt-1"
                        )}>
                            {message.content}
                            {message.isEdited && <span className="text-[11px] text-[var(--wa-text-secondary)] italic ml-1">(edited)</span>}
                        </div>
                    )}

                </div>

                {/* Metadata (Time + Ticks + Star) - Placed nicely at bottom right */}
                <div className={cn(
                    "flex items-center justify-end gap-1 px-2 pb-1.5 -mt-1 select-none float-right",
                    (isImage || isDoc) ? "absolute bottom-1 right-2 bg-black/30 rounded-full px-2 py-0.5" : ""
                )}>
                    {message.isStarred && (
                        <Star className={cn(
                            "w-3 h-3 fill-current mb-[1px]",
                            (isImage || isDoc) ? "text-white/90" : "text-[var(--wa-text-secondary)]"
                        )} />
                    )}

                    <span className={cn("text-[10px] sm:text-[11px] min-w-fit", (isImage || isDoc) ? "text-white/90" : "text-[var(--wa-text-secondary)] group-hover/bubble:text-[var(--wa-text-secondary)]")}>
                        {format(new Date(message.timestamp), 'h:mm a')}
                    </span>
                    {isMe && (
                        <span className={cn(
                            "text-[14px] flex items-center",
                            message.status === 'read' ? "text-[#53bdeb]" : "text-[var(--wa-text-secondary)]",
                            (isImage || isDoc) && "text-white/90"
                        )}>
                            {message.status === 'sent' && <Check className="w-3.5 h-3.5" />}
                            {message.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5" />}
                            {message.status === 'read' && <CheckCheck className="w-3.5 h-3.5" />}
                        </span>
                    )}
                </div>

                {/* Tail (CSS Hack) */}
                {isMe ? (
                    <span className="absolute top-0 -right-[8px] w-0 h-0 border-[8px] border-transparent border-t-[var(--wa-outgoing-bg)] border-l-[var(--wa-outgoing-bg)] transform rotate-0" />
                ) : (
                    <span className="absolute top-0 -left-[8px] w-0 h-0 border-[8px] border-transparent border-t-[var(--wa-incoming-bg)] border-r-[var(--wa-incoming-bg)] transform rotate-0" />
                )}
            </div>
        </div>
    );
};
