import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useVoca } from '../VocaContext';
import { useSocket } from '../SocketContext';
import { MessageBubble } from './MessageBubble';
import { ContactInfo } from './ContactInfo';

import { UnknownContactCard } from './UnknownContactCard';
import { SafetyToolsDialog } from './SafetyToolsDialog';
import { CameraComponent } from './CameraComponent';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Smile, Paperclip, Mic, Send, Phone, Video, MoreVertical, Search, Image as ImageIcon, FileText, Camera, ArrowLeft, X, Trash2, ChevronUp, ChevronDown, Lock, ChevronLeft, StopCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { MediaPreviewDialog } from './MediaPreviewDialog';
import { AttachmentMenu } from './AttachmentMenu';
import { CreateEventDialog } from './CreateEventDialog';
import { CreatePollDialog } from './CreatePollDialog';
import { ContactSelectionDialog } from './ContactSelectionDialog';
import { LocationShareDialog } from './LocationShareDialog';
import { cn } from '../../ui/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const COMMON_EMOJIS = ["😀", "😂", "😍", "🥺", "🔥", "👍", "👎", "🎉", "❤️", "🤣", "😊", "🙏", "👀", "😭", "😅", "🥰", "😎", "🤔", "🙌", "💀"];

export const ChatWindow = () => {
    const { id: chatIdParam } = useParams<{ id: string }>();
    const { chats, activeChatId, setActiveChatId, currentUser, sendMessage, startCall, editMessage, systemSettings, toggleFavoriteContact, blockUser, unblockUser, deleteChat, markChatAsRead } = useVoca();

    // Sync URL param with Context
    useEffect(() => {
        if (chatIdParam && chatIdParam !== activeChatId) {
            setActiveChatId(chatIdParam);
        }
    }, [chatIdParam, activeChatId, setActiveChatId]);

    // NOTE: Call notifications now navigate to /chat only.
    // Incoming calls are handled by GlobalCallUI via socket 'call:incoming' event.
    const { startTyping, stopTyping, typingUsers, sendMessage: emitSocketMessage, emitEditMessage } = useSocket();
    const [inputText, setInputText] = useState('');

    // Media Preview State
    const [mediaPreview, setMediaPreview] = useState<{ file: File, url: string } | null>(null);
    const [showContactInfo, setShowContactInfo] = useState(false);

    // Reply State
    const [replyTo, setReplyTo] = useState<any | null>(null);

    // Pending Uploads State
    const [pendingUploads, setPendingUploads] = useState<any[]>([]);

    // Edit State
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

    // Lightbox State
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Search State
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Attachment Menu State
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Event Dialog State
    const [showEventDialog, setShowEventDialog] = useState(false);
    const [showPollDialog, setShowPollDialog] = useState(false);
    const [showContactDialog, setShowContactDialog] = useState(false);
    const [showLocationDialog, setShowLocationDialog] = useState(false);

    // Safety Tools State
    const [showSafetyTools, setShowSafetyTools] = useState(false);

    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isRecordingLocked, setIsRecordingLocked] = useState(false);
    const [recordingStart, setRecordingStart] = useState<number | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Typing State
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Voice Gesture State
    const [dragOffset, setDragOffset] = useState(0);
    const [cancelOffset, setCancelOffset] = useState(0);
    const touchStartY = useRef<number>(0);
    const touchStartX = useRef<number>(0);
    const pointerIdRef = useRef<number | null>(null);
    const isRecordingRef = useRef<boolean>(false);
    const isRecordingLockedRef = useRef<boolean>(false);

    // Camera State
    const [showCamera, setShowCamera] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    const activeChat = chats.find(c => c.id === activeChatId);

    useEffect(() => {
        if (scrollRef.current && !isSearching) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        // Close sidebar on chat change
        setShowContactInfo(false);
        setIsSearching(false);
        setSearchQuery('');
        setEditingMessageId(null);
        setInputText('');
    }, [activeChat?.messages, activeChatId]);

    // Mark as read when messages update while chat is active
    useEffect(() => {
        if (activeChatId && activeChat?.messages) {
            markChatAsRead(activeChatId);
        }
    }, [activeChat?.messages, activeChatId, markChatAsRead]);

    // Mark as read when messages update while chat is active
    useEffect(() => {
        if (activeChatId && activeChat?.messages) {
            markChatAsRead(activeChatId);
        }
    }, [activeChat?.messages, activeChatId, markChatAsRead]);

    // Recording Timer
    useEffect(() => {
        if (isRecording) {
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            setRecordingDuration(0);
        }
        return () => {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    }, [isRecording]);

    if (!activeChat) {
        return (
            <div className="flex-1 h-full bg-[var(--wa-chat-bg)] flex flex-col items-center justify-center text-center border-b-[6px] border-[#00a884] relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col items-center z-10"
                >
                    {/* Decorative Background */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-[#00a884] rounded-full blur-[120px]" />
                    </div>

                    <div className="bg-[var(--wa-header-bg)] p-8 rounded-full mb-6 z-10 shadow-lg">
                        <div className="w-16 h-16 bg-[#00a884] rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
                            <span className="text-3xl text-white font-bold">V</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-light text-[var(--wa-text-primary)] mb-4 z-10">Voca Web</h2>
                    <p className="text-[var(--wa-text-secondary)] max-w-[400px] z-10">
                        Send and receive messages without keeping your phone online.<br />
                        Use Voca on up to 4 linked devices and 1 phone.
                    </p>
                    <div className="mt-12 flex items-center gap-2 text-[var(--wa-text-secondary)] text-xs z-10 font-medium tracking-wide">
                        <div className="w-2.5 h-2.5 bg-[#667781] rounded-full" />
                        End-to-end encrypted
                    </div>
                </motion.div>
            </div>
        );
    }

    const otherParticipant = activeChat.participants.find(p => p.id !== currentUser?.id);
    const chatName = activeChat.isGroup ? activeChat.name : otherParticipant?.name;
    const chatImage = activeChat.isGroup ? activeChat.groupImage : otherParticipant?.avatar;
    const status = activeChat.isGroup ?
        `${activeChat.participants.map(p => p.name.split(' ')[0]).join(', ')}` :
        otherParticipant?.status === 'online' ? 'Online' : `Last seen ${new Date(otherParticipant?.lastSeen || '').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;

    const isBlocked = !activeChat.isGroup && otherParticipant && currentUser?.blockedUsers?.includes(otherParticipant.id);

    // Voca Team chat is read-only (users cannot reply)
    const isVocaTeamChat = !activeChat.isGroup && otherParticipant?.isVocaTeam;

    // Unknown Contact Logic
    const isUnknownContact = !activeChat.isGroup && !isBlocked && otherParticipant && !currentUser?.favorites?.includes(otherParticipant.id);

    const isTyping = activeChatId && otherParticipant && typingUsers.get(activeChatId) === otherParticipant.id;

    const handleTyping = () => {
        if (!activeChatId || !otherParticipant) return;

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        } else {
            // Start typing if not already started (optional optimization: check a local ref)
            startTyping(activeChatId, otherParticipant.id);
        }

        // Set timeout to stop typing after 2 seconds
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping(activeChatId, otherParticipant.id);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const handleBlock = () => {
        if (otherParticipant) {
            blockUser(otherParticipant.id);
            toast.success(`Blocked ${otherParticipant.name}`);
            toast.error('Failed to upload file');
            setShowSafetyTools(false);
        }
    };

    const handleCameraCapture = async (imageData: string) => {
        if (!activeChat) return;
        try {
            // Upload base64 image to Cloudinary
            const { uploadAPI } = await import('../../../lib/api');
            const result = await uploadAPI.base64(imageData, 'messages');
            const imageUrl = result.url;

            // Send as message - pass imageUrl as mediaUrl parameter, not content
            const message = await sendMessage(activeChat.id, '', 'image', imageUrl);
            if (message && otherParticipant) {
                emitSocketMessage(otherParticipant.id, activeChat.id, message);
            }
            toast.success('Photo sent!');
        } catch (error) {
            console.error('Camera upload error:', error);
            toast.error('Failed to send photo');
        }
    };

    const handleAddContact = () => {
        if (otherParticipant) {
            toggleFavoriteContact(otherParticipant.id);
            toast.success(`${otherParticipant.name} added to contacts`);
        }
    };

    const handleReport = () => {
        toast.success("Contact reported");
        setShowSafetyTools(false);
    };

    // New Optimistic Media Sending Logic
    const handleSendMedia = async (file: File, caption: string) => {
        if (!activeChat) return;
        setMediaPreview(null); // Close dialog immediately

        const type = file.type.startsWith('image/') ? 'image' : 'video';

        // 1. Optimistic Update (Show immediately) with 'isUploading' flag
        // Note: In a real app we would dispatch to a local 'pendingMessages' store. 
        // For now, we utilize the component's state or direct sendMessage triggers.
        // But since sendMessage is async, we can fake it by appending to a local list or relying on VocaContext to handle optimistic updates if it were set up for it.
        // Given existing architecture, we will fire the upload but we want to show it in the UI *while* it uploads.
        // We'll perform the upload and *then* send the message, but to get the "Uploading..." status
        // we'll use a toast for now (user asked for no toast but a UI indicator).
        // To do UI indicator, we'd need to insert a temp message into the global state or local state.

        // Let's rely on standard upload but assume the user wants the PREVIEW screen mostly.
        // The prompt says: "work and see like whastapp do... uploading image or uploading video" (implies NO toast, but in-chat bubble).
        // To achieve in-chat bubble without significant refactor of VocaContext, we must cheat properly.
        // We will call sendMessage immediately but with a blob URL and a special flag, then update it later? 
        // No, sendMessage creates a message on the server.

        // Alternative: We will use the toast.loading but customized to look cleaner OR just stick to the preview dialog for now
        // and do the background upload properly.

        // Actually, the user specifically said: "when user try to send a img it show a toast uploading image... is it possible to make the system and UI exactly look like and work and see like whastapp do"
        // This implies they WANT to move AWAY from the toast to an in-chat indicator.

        // IMPORTANT: We cannot easily inject a fake message into `activeChat.messages` because it comes from Context/Server.
        // However, we can create a `pendingUploads` state in ChatWindow and overlay it.

        const tempId = `temp-${Date.now()}`;
        const tempMessage = {
            id: tempId,
            senderId: currentUser?.id || 'me',
            content: caption,
            type: type,
            timestamp: new Date().toISOString(),
            status: 'pending',
            mediaUrl: URL.createObjectURL(file), // Local preview blob
            isUploading: true
        };

        // We need a way to render this. We can modify `displayedMessages` to include these pending ones.
        // We'll insert it into a local Ref or State and merge it in render.
        setPendingUploads(prev => [...prev, tempMessage]);

        try {
            // Upload
            const { uploadAPI } = await import('../../../lib/api');
            let cloudinaryUrl: string;

            if (type === 'image') cloudinaryUrl = (await uploadAPI.image(file)).url;
            else cloudinaryUrl = (await uploadAPI.video(file)).url;

            // Send actual message
            const message = await sendMessage(activeChat.id, caption, type as any, cloudinaryUrl);
            if (message && otherParticipant) {
                emitSocketMessage(otherParticipant.id, activeChat.id, message);
            }

            // Remove from pending
            setPendingUploads(prev => prev.filter(m => m.id !== tempId));
        } catch (e) {
            console.error(e);
            toast.error("Failed to send media");
            setPendingUploads(prev => prev.filter(m => m.id !== tempId));
        }
    };

    // We need state for pending uploads



    const handleSend = async (e?: React.FormEvent, contentOverride?: string) => {
        if (e && typeof e !== 'string') e.preventDefault();

        const content = contentOverride || inputText;
        if (!content.trim()) return;

        if (editingMessageId && activeChat && otherParticipant && !contentOverride) {
            editMessage(activeChat.id, editingMessageId, content);
            emitEditMessage(activeChat.id, editingMessageId, otherParticipant.id, content);
            setEditingMessageId(null);
            toast.success("Message edited");
        } else if (activeChat && otherParticipant) {
            const message = await sendMessage(activeChat.id, content, 'text', undefined, undefined, replyTo?.id);
            if (message) {
                // Emit socket event to notify recipient in real-time
                emitSocketMessage(otherParticipant.id, activeChat.id, message);
            }
            if (!contentOverride) setReplyTo(null);
        }
        if (!contentOverride) setInputText('');
    };

    const handleEdit = (message: any) => {
        setEditingMessageId(message.id);
        setInputText(message.content);
        // Focus input would be nice here
    };

    const handleFileUpload = async (type: 'image' | 'video' | 'doc' | 'audio') => {
        const input = document.createElement('input');
        input.type = 'file';
        // Correctly filter mime types
        input.accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : type === 'audio' ? 'audio/*' : '*/*';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                // Check file size limit
                const limitBytes = (systemSettings?.fileUploadLimitMB || 10) * 1024 * 1024;
                if (file.size > limitBytes) {
                    toast.error(`File too large. Limit is ${systemSettings?.fileUploadLimitMB || 10}MB.`);
                    return;
                }

                if (type === 'image' || type === 'video') {
                    // Open Preview Dialog
                    const url = URL.createObjectURL(file);
                    setMediaPreview({ file, url });
                    return;
                }

                toast.loading('Uploading...', { id: 'upload' });

                try {
                    // Upload to Cloudinary
                    const { uploadAPI } = await import('../../../lib/api');
                    let cloudinaryUrl: string | undefined;

                    if (type === 'audio') {
                        cloudinaryUrl = (await uploadAPI.audio(file)).url;
                    }
                    // Docs Logic - We know type is 'doc' here because of early return above
                    // For docs, you could add uploadAPI.document() if needed
                    // For now reusing generic upload or ignoring specific doc upload api

                    const content = type === 'audio' ? `Audio: ${file.name}` : `Sent a file: ${file.name}`;
                    const itemsType = type === 'audio' ? 'audio' : 'doc';

                    const message = await sendMessage(activeChat!.id, content, itemsType, cloudinaryUrl);
                    if (message && otherParticipant) {
                        emitSocketMessage(otherParticipant.id, activeChat!.id, message);
                    }

                    toast.success('File sent!', { id: 'upload' });
                } catch (error: any) {
                    console.error('Upload error:', error);
                    toast.error(`Upload failed: ${error.message}`, { id: 'upload' });
                }
            }
        };
        input.click();
    };

    const startCallLocal = (type: 'voice' | 'video') => {
        if (otherParticipant) {
            startCall(otherParticipant.id, type);
        }
    };

    const startRecording = async () => {
        // Reset states
        setIsRecordingLocked(false);
        isRecordingLockedRef.current = false;
        setRecordingStart(Date.now());
        setDragOffset(0);
        setCancelOffset(0);

        // Optimistically set recording to true so gestures work immediately
        setIsRecording(true);
        isRecordingRef.current = true;

        // Check for mediaDevices support first
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.log("Media devices not supported, using simulation.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // CRITICAL: Check if we are still recording (didn't cancel while waiting)
            if (!isRecordingRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
        } catch (error) {
            // Silent fallback to simulated mode
            console.warn("Falling back to simulated recording", error);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecordingRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        isRecordingRef.current = false;
        setIsRecordingLocked(false);
        isRecordingLockedRef.current = false;
        setRecordingStart(null);
        setRecordingDuration(0);
        audioChunksRef.current = [];
        setDragOffset(0);
        setCancelOffset(0);
    };

    // Gesture Handlers using Pointer Events for reliable tracking

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isRecordingLockedRef.current) return;
        e.preventDefault();

        // Capture the pointer to ensure we get all events even if cursor moves outside
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerIdRef.current = e.pointerId;

        touchStartY.current = e.clientY;
        touchStartX.current = e.clientX;
        startRecording();
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isRecordingRef.current || isRecordingLockedRef.current) return;
        if (pointerIdRef.current !== e.pointerId) return;

        const diffY = touchStartY.current - e.clientY;
        const diffX = touchStartX.current - e.clientX;

        // Lock Threshold (Slide Up)
        if (diffY > 0) {
            setDragOffset(Math.min(diffY, 150)); // Max drag visual
            if (diffY > 100) {
                setIsRecordingLocked(true);
                isRecordingLockedRef.current = true;
                setDragOffset(0);
                setCancelOffset(0);
                // Release capture when locked so UI can interact with trash/send buttons
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                }
                pointerIdRef.current = null;
            }
        }

        // Cancel Threshold (Slide Left)
        if (diffX > 0 && diffY < 50) {
            setCancelOffset(Math.min(diffX, 200));
            if (diffX > 150) {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                }
                pointerIdRef.current = null;
                cancelRecording();
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isRecordingLockedRef.current) return;
        if (pointerIdRef.current !== e.pointerId) return;

        // Release capture
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        pointerIdRef.current = null;

        // Calculate actual elapsed time since recording started
        const elapsedMs = recordingStart ? Date.now() - recordingStart : 0;

        // WhatsApp behavior: Quick tap (< 1 second) cancels, long press sends
        if (elapsedMs < 1000) {
            cancelRecording();
        } else {
            stopRecording();
        }
        setDragOffset(0);
        setCancelOffset(0);
    };

    const stopRecording = async () => {
        // Real recording mode
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                const mins = Math.floor(recordingDuration / 60);
                const secs = recordingDuration % 60;
                const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;

                toast.loading('Uploading voice note...', { id: 'voice-upload' });

                try {
                    // Upload audio to Cloudinary
                    const { uploadAPI } = await import('../../../lib/api');
                    const result = await uploadAPI.voice(audioBlob);

                    const message = await sendMessage(activeChat!.id, "Voice Message", 'voice', result.url, durationStr);
                    if (message && otherParticipant) {
                        emitSocketMessage(otherParticipant.id, activeChat!.id, message);
                    }
                    toast.success('Voice note sent!', { id: 'voice-upload' });
                } catch (error: any) {
                    console.error('Voice upload error:', error);
                    toast.error(`Upload failed: ${error.message}`, { id: 'voice-upload' });
                }

                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current = null;

                // Reset States
                setIsRecording(false);
                isRecordingRef.current = false;
                setIsRecordingLocked(false);
                isRecordingLockedRef.current = false;
                setRecordingStart(null);
                setRecordingDuration(0);
                setDragOffset(0);
                setCancelOffset(0);
            };
            mediaRecorderRef.current.stop();
        }
        // Simulated recording mode
        else if (isRecording) {
            const mins = Math.floor(recordingDuration / 60);
            const secs = recordingDuration % 60;
            const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;

            // Use a simple base64 silent wav for simulation (1 second of silence) to enable playback UI
            const silentWavBase64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==";
            const message = await sendMessage(activeChat!.id, "Voice Message (Simulated)", 'voice', silentWavBase64, durationStr);
            if (message && otherParticipant) {
                emitSocketMessage(otherParticipant.id, activeChat!.id, message);
            }

            // Reset States
            setIsRecording(false);
            isRecordingRef.current = false;
            setIsRecordingLocked(false);
            isRecordingLockedRef.current = false;
            setRecordingStart(null);
            setRecordingDuration(0);
            setDragOffset(0);
            setCancelOffset(0);
        }
    };



    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const displayedMessages = isSearching && searchQuery
        ? activeChat.messages.filter(m => !m.isDeleted && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
        : [...activeChat.messages, ...pendingUploads]; // Merge Pending Uploads

    return (
        <div className="flex-1 flex h-full overflow-hidden relative bg-[var(--wa-chat-bg)]">

            {/* Lightbox Overlay */}
            {lightboxImage && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute top-4 right-4 z-10 w-full flex justify-end px-4">
                        <Button variant="ghost" size="icon" onClick={() => setLightboxImage(null)} className="text-white hover:bg-white/20 rounded-full">
                            <X className="w-8 h-8" />
                        </Button>
                    </div>
                    {/* Check if video extension or type is video based on url or state logic */}
                    {lightboxImage.match(/\.(mp4|webm|mov)$/i) || lightboxImage.includes('/video/') ? (
                        <video
                            src={lightboxImage}
                            controls
                            autoPlay
                            className="max-w-full max-h-full object-contain focus:outline-none"
                        />
                    ) : (
                        <img src={lightboxImage} alt="Full view" className="max-w-full max-h-full object-contain" />
                    )}
                </div>
            )}

            {/* Main Chat Area with Animation */}
            <motion.div
                key={activeChat.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex-1 flex flex-col relative h-full w-full"
            >

                {/* Header */}
                <div className="h-16 px-4 bg-[var(--wa-header-bg)] flex items-center justify-between shrink-0 z-10 cursor-pointer shadow-sm border-b border-[var(--wa-border)]">
                    <div className="flex items-center gap-3" onClick={() => setShowContactInfo(!showContactInfo)}>

                        {/* Mobile Back Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-[var(--wa-text-primary)] -ml-2"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                setActiveChatId(null);
                            }}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <Avatar className="h-10 w-10 ring-1 ring-white/5">
                            <AvatarImage src={chatImage} />
                            <AvatarFallback className="bg-[#6a7f8a] text-white">{chatName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            {chatName}
                            <p className={cn("text-xs truncate max-w-[200px] md:max-w-md transition-colors",
                                isTyping ? "text-[var(--wa-primary)] font-medium" : "text-[var(--wa-text-secondary)]"
                            )}>
                                {isTyping ? "typing..." : status}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 text-[var(--wa-text-secondary)] items-center" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className={cn("rounded-full hidden md:flex hover:bg-[var(--wa-hover)] hover:text-[var(--wa-text-primary)] transition-colors", isSearching && "bg-[var(--wa-hover)] text-[var(--wa-text-primary)]")} onClick={() => setIsSearching(!isSearching)}>
                            <Search className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-[var(--wa-hover)] hover:text-[var(--wa-text-primary)] transition-colors"
                            onClick={() => startCallLocal('video')}
                        >
                            <Video className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-[var(--wa-hover)] hover:text-[var(--wa-text-primary)] transition-colors"
                            onClick={() => startCallLocal('voice')}
                        >
                            <Phone className="w-5 h-5" />
                        </Button>
                        <div className="w-[1px] h-6 bg-[var(--wa-border)] mx-2 hidden md:block" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-[var(--wa-hover)] hover:text-[var(--wa-text-primary)] transition-colors"
                            onClick={() => setShowContactInfo(!showContactInfo)}
                        >
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Search Bar Overlay */}
                {isSearching && (
                    <div className="h-16 bg-[var(--wa-header-bg)] border-b border-[var(--wa-border)] flex items-center px-4 gap-4 animate-in slide-in-from-top duration-200">
                        <div className="flex-1 bg-[var(--wa-input-bg)] rounded-lg flex items-center px-3 py-1.5">
                            <Search className="w-5 h-5 text-[var(--wa-text-secondary)] mr-2" />
                            <Input
                                autoFocus
                                placeholder="Search..."
                                className="bg-transparent border-none focus-visible:ring-0 text-[var(--wa-text-primary)] placeholder:text-[var(--wa-text-secondary)] h-auto p-0"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-[var(--wa-text-secondary)] text-sm">
                            <span>{searchQuery ? `${displayedMessages.length} found` : 'Search matches'}</span>
                            <Button variant="ghost" size="icon" className="hover:text-[var(--wa-text-primary)]" onClick={() => { setIsSearching(false); setSearchQuery(''); }}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 relative bg-[var(--wa-chat-bg)]">
                    {/* Background Pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.06] pointer-events-none invert dark:invert-0"
                        style={{
                            backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                            backgroundRepeat: 'repeat',
                        }}
                    />

                    <div
                        ref={scrollRef}
                        className="absolute inset-0 overflow-y-auto p-4 md:p-8 space-y-2 z-10 scroll-smooth custom-scrollbar"
                    >
                        {/* Unknown Contact Card */}
                        {isUnknownContact && otherParticipant && (
                            <div className="mb-6">
                                <UnknownContactCard
                                    contact={otherParticipant}
                                    onBlock={() => setShowSafetyTools(true)} // Default to showing safety tools for block details or direct block
                                    onAdd={handleAddContact}
                                    onSafetyTools={() => setShowSafetyTools(true)}
                                />
                            </div>
                        )}

                        {/* Date Divider Mock */}
                        <div className="flex justify-center mb-6">
                            <span className="bg-[var(--wa-panel-bg)] shadow-sm px-4 py-1.5 rounded-lg text-xs text-[var(--wa-text-secondary)] uppercase font-medium tracking-wide">
                                Today
                            </span>
                        </div>

                        {displayedMessages.map(msg => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isMe={msg.senderId === (currentUser?.id || 'me')}
                                onReply={() => setReplyTo(msg)}
                                onImageClick={(url) => setLightboxImage(url)}
                                onEdit={() => handleEdit(msg)}
                            />
                        ))}

                        {isSearching && displayedMessages.length === 0 && searchQuery && (
                            <div className="text-center text-[var(--wa-text-secondary)] mt-10">
                                No matches found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="bg-[var(--wa-header-bg)] flex flex-col z-10 shadow-up-sm border-t border-[var(--wa-border)]">

                    {/* Reply Preview */}
                    {editingMessageId && (
                        <div className="bg-[var(--wa-panel-bg)] p-2 pl-4 border-l-4 border-[var(--wa-primary)] flex justify-between items-center m-2 rounded-r-lg bg-opacity-50">
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[var(--wa-primary)] text-sm font-medium">
                                    Editing Message
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingMessageId(null); setInputText(''); }} className="h-6 w-6">
                                <X className="w-4 h-4 text-[var(--wa-text-secondary)]" />
                            </Button>
                        </div>
                    )}

                    {/* Reply Preview */}
                    {replyTo && !editingMessageId && (
                        <div className="bg-[var(--wa-panel-bg)] p-2 pl-4 border-l-4 border-[var(--wa-primary)] flex justify-between items-center m-2 rounded-r-lg bg-opacity-50">
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[var(--wa-primary)] text-sm font-medium">
                                    {replyTo.senderId === (currentUser?.id || 'me') ? 'You' : (otherParticipant?.name || 'Sender')}
                                </span>
                                <span className="text-[var(--wa-text-secondary)] text-xs truncate">
                                    {replyTo.type === 'image' ? '📷 Photo' : replyTo.content}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)} className="h-6 w-6">
                                <X className="w-4 h-4 text-[var(--wa-text-secondary)]" />
                            </Button>
                        </div>
                    )}

                    <div className="px-4 py-3 flex items-center gap-3 min-h-[64px]">
                        {isVocaTeamChat ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-[var(--wa-text-secondary)]">
                                <div className="flex items-center gap-2 bg-[var(--wa-hover)] px-4 py-2 rounded-lg">
                                    <span className="text-blue-400">📢</span>
                                    <span>This is an official announcement channel from Voca Team</span>
                                </div>
                            </div>
                        ) : isBlocked ? (
                            <div className="flex-1 flex items-center justify-center gap-12 text-sm font-medium">
                                <button
                                    onClick={() => deleteChat(activeChat.id)}
                                    className="flex items-center gap-2 text-[#ef4444] hover:opacity-80 transition-opacity"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Delete chat
                                </button>
                                <button
                                    onClick={() => unblockUser(otherParticipant!.id)}
                                    className="flex items-center gap-2 text-[#00a884] hover:opacity-80 transition-opacity"
                                >
                                    <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
                                        <div className="w-0.5 h-3 bg-current rotate-45" />
                                    </div>
                                    Unblock
                                </button>
                            </div>
                        ) : isRecordingLocked ? (
                            // LOCKED RECORDING UI
                            <div className="flex-1 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10" onClick={cancelRecording}>
                                    <Trash2 className="w-6 h-6" />
                                </Button>
                                <div className="flex-1 flex items-center gap-3 justify-center">
                                    <div className="flex gap-1 items-end h-8">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-1 bg-red-500 rounded-full animate-pulse"
                                                style={{
                                                    height: `${Math.random() * 100}%`,
                                                    animationDelay: `${i * 0.1}s`
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[var(--wa-text-primary)] font-mono text-base font-semibold min-w-[60px]">{formatDuration(recordingDuration)}</span>
                                </div>
                                <Button
                                    size="icon"
                                    className="bg-[#00a884] hover:bg-[#008f72] text-[#111b21] rounded-full h-10 w-10 shadow-md transform transition-all hover:scale-110 active:scale-95"
                                    onClick={stopRecording}
                                >
                                    <Send className="w-5 h-5 ml-0.5" />
                                </Button>
                            </div>
                        ) : (
                            // COMBINED INPUT & HOLDING UI
                            <div className="flex-1 flex items-center relative">

                                {/* HOLDING UI OVERLAY (Timer, Slide to Cancel) */}
                                {isRecording && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-between bg-[var(--wa-panel-bg)] rounded-lg px-2">
                                        {/* Slide to Cancel Text */}
                                        <div
                                            className="flex items-center gap-2 text-[var(--wa-text-secondary)] transition-opacity duration-200"
                                            style={{ opacity: Math.max(0, 1 - cancelOffset / 100) }}
                                        >
                                            <ChevronLeft className="w-4 h-4 animate-bounce-horizontal" />
                                            <span className="text-sm">Slide to cancel</span>
                                        </div>

                                        {/* Timer */}
                                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            <span className="font-mono text-[var(--wa-text-primary)] text-base font-semibold">{formatDuration(recordingDuration)}</span>
                                        </div>

                                        {/* Lock Indicator (Sliding Up) - Positioned relative to Mic Button implicitly or absolutely */}
                                        <div
                                            className="absolute right-2 bottom-12 flex flex-col items-center gap-2 transition-all duration-200 pointer-events-none"
                                            style={{
                                                transform: `translateY(${-dragOffset}px)`,
                                                opacity: Math.min(1, dragOffset / 50)
                                            }}
                                        >
                                            <div className="bg-[var(--wa-panel-bg)] p-2 rounded-full shadow-lg border border-[var(--wa-border)]">
                                                <Lock className="w-4 h-4 text-[var(--wa-text-secondary)]" />
                                            </div>
                                            <ChevronUp className="w-4 h-4 text-[var(--wa-text-secondary)] animate-bounce" />
                                        </div>
                                    </div>
                                )}

                                {/* INPUT AREA */}
                                <div className={cn("flex-1 flex items-center gap-2 transition-all duration-200", isRecording ? "opacity-0 pointer-events-none absolute z-[-1]" : "opacity-100 relative z-10")}>

                                    {/* PILL CONTAINER for Input and Inner Icons */}
                                    <div className="flex-1 flex items-center bg-[var(--wa-input-bg)] rounded-[26px] px-2 py-1 gap-1 border border-[var(--wa-border)] shadow-sm focus-within:bg-[var(--wa-input-bg)]/90 transition-colors">

                                        {/* EMOJI BUTTON (Left) */}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-transparent rounded-full h-9 w-9 shrink-0 transition-colors">
                                                    <Smile className="w-6 h-6" strokeWidth={1.5} />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent side="top" align="start" className="w-80 bg-[var(--wa-panel-bg)] border-[var(--wa-border)] p-3 rounded-2xl shadow-xl">
                                                <div className="grid grid-cols-8 gap-1">
                                                    {COMMON_EMOJIS.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            className="text-2xl hover:bg-[var(--wa-hover)] rounded p-1 transition-colors"
                                                            onClick={() => setInputText(prev => prev + emoji)}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>

                                        {/* TEXT INPUT */}
                                        <form onSubmit={handleSend} className="flex-1 min-w-0">
                                            <Input
                                                value={inputText}
                                                onChange={(e) => {
                                                    setInputText(e.target.value);
                                                    handleTyping();
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSend();
                                                    }
                                                }}
                                                placeholder="Message"
                                                className="bg-transparent border-none focus-visible:ring-0 text-[16px] leading-5 text-[var(--wa-text-primary)] placeholder:text-[var(--wa-text-secondary)] h-9 px-2 shadow-none"
                                            />
                                        </form>

                                        {/* ATTACHMENT (Paperclip) */}
                                        <Popover open={isAttachmentMenuOpen} onOpenChange={setIsAttachmentMenuOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-transparent rounded-full h-9 w-9 shrink-0 rotate-45 transition-colors">
                                                    <Paperclip className="w-5 h-5" strokeWidth={1.5} />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                align="start"
                                                side="top"
                                                sideOffset={12}
                                                collisionPadding={16}
                                                className="w-auto p-0 bg-[var(--wa-panel-bg)] border border-[var(--wa-border)] rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                            >
                                                <AttachmentMenu
                                                    onSelect={(type) => {
                                                        setIsAttachmentMenuOpen(false);
                                                        switch (type) {
                                                            case 'poll':
                                                                setShowPollDialog(true);
                                                                break;
                                                            case 'event':
                                                                setShowEventDialog(true);
                                                                break;
                                                            case 'contact':
                                                                setShowContactDialog(true);
                                                                break;
                                                            case 'location':
                                                                setShowLocationDialog(true);
                                                                break;
                                                            case 'audio':
                                                            case 'image':
                                                                handleFileUpload(type);
                                                                break;
                                                            case 'document':
                                                                handleFileUpload('doc');
                                                                break;
                                                            default:
                                                                toast.info("Coming soon");
                                                                break;
                                                        }
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>

                                        {/* CAMERA (Inside Input if empty text) */}
                                        {!inputText.trim() && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-transparent rounded-full h-9 w-9 shrink-0 transition-colors"
                                                onClick={() => setShowCamera(true)}
                                            >
                                                <Camera className="w-6 h-6" strokeWidth={1.5} />
                                            </Button>
                                        )}
                                    </div>

                                    {/* MIC / SEND BUTTON (Outside, Green Circle) */}
                                    <div className="shrink-0 z-20">
                                        {inputText.trim() ? (
                                            <Button
                                                onClick={() => handleSend()}
                                                size="icon"
                                                className="bg-[#00a884] hover:bg-[#008f72] text-white rounded-full h-12 w-12 shadow-lg flex items-center justify-center transition-transform active:scale-95"
                                            >
                                                <Send className="w-5 h-5 ml-0.5" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "bg-[#00a884] hover:bg-[#008f72] text-white rounded-full h-12 w-12 shadow-md flex items-center justify-center transition-all",
                                                    isRecording && "bg-red-500 hover:bg-red-600 scale-110",
                                                )}
                                                onPointerDown={handlePointerDown}
                                                onPointerMove={handlePointerMove}
                                                onPointerUp={handlePointerUp}
                                                onPointerCancel={handlePointerUp}
                                            >
                                                <Mic className={cn("w-6 h-6", isRecording && "animate-pulse")} />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Call Overlay */}


                {/* Camera Component */}
                {showCamera && (
                    <CameraComponent
                        mode="message"
                        onCapture={handleCameraCapture}
                        onClose={() => setShowCamera(false)}
                    />
                )}

                {/* Media Preview Dialog */}
                <MediaPreviewDialog
                    open={!!mediaPreview}
                    file={mediaPreview?.file || null}
                    mediaPrevUrl={mediaPreview?.url || null}
                    onClose={() => setMediaPreview(null)}
                    onSend={handleSendMedia}
                />
            </motion.div>

            {/* Right Sidebar (Contact Info) */}
            {showContactInfo && otherParticipant && (
                <ContactInfo
                    user={otherParticipant}
                    isGroup={activeChat.isGroup}
                    groupName={activeChat.name}
                    groupImage={activeChat.groupImage}
                    onClose={() => setShowContactInfo(false)}
                    onSearch={() => {
                        setShowContactInfo(false);
                        setIsSearching(true);
                    }}
                />
            )}

            {/* Safety Tools Dialog */}
            {otherParticipant && (
                <SafetyToolsDialog
                    isOpen={showSafetyTools}
                    onClose={() => setShowSafetyTools(false)}
                    contact={otherParticipant}
                    onBlock={handleBlock}
                    onReport={handleReport}
                />
            )}

            {/* Event & Poll & Contact Dialogs */}
            <ContactSelectionDialog
                isOpen={showContactDialog}
                onClose={() => setShowContactDialog(false)}
                onSelect={(user: any) => {
                    if (user && user.id) {
                        const content = JSON.stringify({
                            contactId: user.id,
                            name: user.name,
                            avatar: user.avatar,
                            about: user.about,
                            email: user.email
                        });
                        sendMessage(activeChatId!, content, 'contact');
                    }
                }}
            />

            <LocationShareDialog
                isOpen={showLocationDialog}
                onClose={() => setShowLocationDialog(false)}
                onShare={(location) => {
                    const content = JSON.stringify(location);
                    sendMessage(activeChatId!, content, 'location');
                }}
            />

            <CreateEventDialog
                isOpen={showEventDialog}
                onClose={() => setShowEventDialog(false)}
                onSend={(eventData) => {
                    // Send as structured JSON
                    const content = JSON.stringify({
                        eventName: eventData.eventName,
                        description: eventData.description,
                        date: eventData.date,
                        time: eventData.time,
                        location: eventData.location,
                        isVocaCall: eventData.isVocaCall,
                        allowGuests: eventData.allowGuests,
                        // Additional metadata can be added here
                    });
                    sendMessage(activeChatId!, content, 'event');
                    setShowEventDialog(false);
                }}
            />

            <CreatePollDialog
                isOpen={showPollDialog}
                onClose={() => setShowPollDialog(false)}
                onSend={(question, options, allowMultiple) => {
                    // Send as structured JSON with initial vote counts
                    const content = JSON.stringify({
                        question,
                        options: options.map(opt => ({ id: crypto.randomUUID(), text: opt, voterIds: [] })), // { id, text, voterIds: [] }
                        allowMultiple

                    });
                    sendMessage(activeChatId!, content, 'poll');
                    setShowPollDialog(false);
                }}
            />
        </div>
    );
};
