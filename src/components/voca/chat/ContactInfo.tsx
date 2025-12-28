import React, { useState } from 'react';
import { User } from '../../../lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { X, Bell, Star, Ban, ThumbsDown, Trash2, Phone, Video, Search, ChevronRight, Lock, Image as ImageIcon, FileText, Link as LinkIcon, Download } from 'lucide-react';
import { Switch } from '../../ui/switch';
import { useVoca } from '../VocaContext';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { MessageBubble } from './MessageBubble';
import { ImageViewer } from './ImageViewer';
import { toast } from 'sonner';

interface ContactInfoProps {
    user: User;
    onClose: () => void;
    isGroup: boolean;
    groupName?: string;
    groupImage?: string;
    onSearch?: () => void;
}

export const ContactInfo = ({ user, onClose, isGroup, groupName, groupImage, onSearch }: ContactInfoProps) => {
    const { createReport, chats, ads, blockUser, deleteChat, setActiveChatId, currentUser, startCall } = useVoca();
    const [isMuted, setIsMuted] = useState(false);
    const [showMedia, setShowMedia] = useState(false);
    const [showStarred, setShowStarred] = useState(false);
    const [showEncryption, setShowEncryption] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [cameFromMedia, setCameFromMedia] = useState(false);

    // Function to open image viewer from media dialog
    const openImageViewer = (imageUrl: string) => {
        setShowMedia(false); // Close media dialog first
        setCameFromMedia(true);
        setLightboxImage(imageUrl);
    };

    // Function to close image viewer
    const closeImageViewer = () => {
        setLightboxImage(null);
        if (cameFromMedia) {
            setShowMedia(true); // Re-open media dialog
            setCameFromMedia(false);
        }
    };

    const displayImage = isGroup ? groupImage : user.avatar;
    const displayName = isGroup ? groupName : user.name;
    const displaySub = isGroup ? `Group • ${user.status === 'online' ? 'Active' : 'Inactive'}` : user.email;

    // Find relevant chat to get data - the chat between currentUser and this contact
    // Find relevant chat to get data
    const relevantChat = isGroup
        ? chats.find(c => c.id === user.id)
        : chats.find(c =>
            !c.isGroup &&
            c.participants.some(p => p.id === user.id) &&
            c.participants.some(p => p.id === currentUser?.id)
        );

    const starredMessages = relevantChat?.messages.filter(m => m.isStarred && !m.isDeleted) || [];
    const mediaMessages = relevantChat?.messages.filter(m => m.type === 'image' && !m.isDeleted) || [];
    const docMessages = relevantChat?.messages.filter(m => m.type === 'doc' && !m.isDeleted) || [];
    const linkMessages = relevantChat?.messages.filter(m => !m.isDeleted && (m.content.includes('http') || m.content.includes('https'))) || [];

    // Get active sidebar ad if any
    const sidebarAd = ads.find(a => a.active && a.position === 'sidebar');

    const handleBlock = () => {
        blockUser(user.id);
        toast.success(`${displayName} blocked`);
        onClose();
    };

    const handleDelete = () => {
        if (relevantChat) {
            deleteChat(relevantChat.id);
            toast.success("Chat deleted");
            onClose();
        }
    };

    const handleGroupClick = () => {
        const groupChat = chats.find(c => c.isGroup && c.name === 'Project Voca Team'); // Mock logic
        if (groupChat) {
            setActiveChatId(groupChat.id);
            onClose();
        } else {
            // Fallback for mock
            toast.info("Opening group chat...");
            // In real app, find the common group ID
        }
    };

    return (
        <div className="w-[350px] md:w-[400px] h-full flex flex-col border-l border-[var(--wa-border)] bg-[var(--wa-sidebar-bg)] animate-in slide-in-from-right duration-300 absolute right-0 z-20 shadow-2xl">

            {/* Image Viewer */}
            {lightboxImage && (
                <ImageViewer
                    imageUrl={lightboxImage}
                    onClose={closeImageViewer}
                />
            )}

            {/* Encryption Dialog */}
            <Dialog open={showEncryption} onOpenChange={setShowEncryption}>
                <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-[var(--wa-primary)]" />
                            End-to-end Encryption
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <p className="text-sm text-[var(--wa-text-secondary)]">
                            Messages and calls are end-to-end encrypted. No one outside of this chat, not even Voca, can read or listen to them.
                        </p>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-[var(--wa-primary)]" />
                                <span>Text and voice messages</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-[var(--wa-primary)]" />
                                <span>Audio and video calls</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-[var(--wa-primary)]" />
                                <span>Photos, videos and documents</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-[var(--wa-primary)]" />
                                <span>Location sharing</span>
                            </div>
                        </div>
                        <Button className="w-full bg-[var(--wa-primary)] text-[#111b21] hover:bg-[var(--wa-primary)]/90" onClick={() => setShowEncryption(false)}>OK</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Starred Messages Dialog */}
            <Dialog open={showStarred} onOpenChange={setShowStarred}>
                <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-md h-[70vh] flex flex-col p-0">
                    <DialogHeader className="p-4 border-b border-[var(--wa-border)]">
                        <DialogTitle>Starred Messages</DialogTitle>
                        <DialogDescription className="sr-only">View your starred messages in this chat.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[var(--wa-chat-bg)]">
                        {starredMessages.length > 0 ? (
                            <div className="space-y-2">
                                {starredMessages.map(msg => (
                                    <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === (currentUser?.id || 'me')} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-[var(--wa-text-secondary)] text-center">
                                <Star className="w-12 h-12 mb-4 opacity-20" />
                                <p>No starred messages</p>
                                <p className="text-xs mt-2">Tap and hold on any message to star it, so you can easily find it later.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Media Gallery Dialog */}
            <Dialog open={showMedia} onOpenChange={setShowMedia}>
                <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-2xl h-[80vh] flex flex-col p-0 z-50">
                    <DialogHeader className="p-4 border-b border-[var(--wa-border)]">
                        <DialogTitle>Media, Links and Docs</DialogTitle>
                        <DialogDescription className="sr-only">Browse shared media, documents, and links in this chat.</DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="media" className="flex-1 flex flex-col">
                        <div className="px-4 pt-2">
                            <TabsList className="bg-[var(--wa-header-bg)] w-full justify-start text-[var(--wa-text-secondary)]">
                                <TabsTrigger value="media" className="data-[state=active]:bg-[var(--wa-hover)] data-[state=active]:text-[var(--wa-primary)] flex-1">Media</TabsTrigger>
                                <TabsTrigger value="docs" className="data-[state=active]:bg-[var(--wa-hover)] data-[state=active]:text-[var(--wa-primary)] flex-1">Docs</TabsTrigger>
                                <TabsTrigger value="links" className="data-[state=active]:bg-[var(--wa-hover)] data-[state=active]:text-[var(--wa-primary)] flex-1">Links</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="media" className="flex-1 p-0 m-0 overflow-hidden">
                            <div className="h-full overflow-y-auto custom-scrollbar">
                                {mediaMessages.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-1 p-1">
                                        {mediaMessages.map(msg => (
                                            <div
                                                key={msg.id}
                                                className="aspect-square relative cursor-pointer hover:opacity-90 group"
                                                onClick={() => openImageViewer(msg.mediaUrl!)}
                                            >
                                                <img
                                                    src={msg.mediaUrl}
                                                    className="w-full h-full object-cover pointer-events-none"
                                                    alt="media"
                                                />
                                                <a
                                                    href={msg.mediaUrl}
                                                    download={`voca-image-${msg.id}.jpg`}
                                                    className="absolute bottom-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--wa-text-secondary)] p-10 text-center">
                                        <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                                        <p>No media shared with {displayName}</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="docs" className="flex-1 p-0 m-0 overflow-hidden">
                            <div className="h-full overflow-y-auto custom-scrollbar">
                                {docMessages.length > 0 ? (
                                    <div className="flex flex-col">
                                        {docMessages.map(msg => (
                                            <div key={msg.id} className="flex items-center gap-4 p-4 hover:bg-[var(--wa-hover)] cursor-pointer border-b border-[var(--wa-border)]">
                                                <div className="w-10 h-12 bg-red-400/20 rounded flex items-center justify-center text-red-400">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0" onClick={() => window.open(msg.mediaUrl || '#', '_blank')}>
                                                    <p className="text-[var(--wa-text-primary)] text-sm font-medium truncate">{msg.content.replace('Sent a file: ', '')}</p>
                                                    <p className="text-[var(--wa-text-secondary)] text-xs">{format(new Date(msg.timestamp), 'MMM d, yyyy')}</p>
                                                </div>
                                                <a
                                                    href={msg.mediaUrl || '#'}
                                                    download={msg.fileName || "document"}
                                                    className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] p-2 hover:bg-[var(--wa-hover)] rounded-full transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Download className="w-5 h-5" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--wa-text-secondary)] p-10 text-center">
                                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                                        <p>No documents shared</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="links" className="flex-1 p-0 m-0 overflow-hidden">
                            <div className="h-full overflow-y-auto custom-scrollbar">
                                {linkMessages.length > 0 ? (
                                    <div className="flex flex-col">
                                        {linkMessages.map(msg => (
                                            <div key={msg.id} className="flex items-center gap-4 p-4 hover:bg-[var(--wa-hover)] cursor-pointer border-b border-[var(--wa-border)]" onClick={() => {
                                                const url = msg.content.match(/(https?:\/\/[^\s]+)/g)?.[0];
                                                if (url) window.open(url, '_blank');
                                            }}>
                                                <div className="w-10 h-10 bg-[var(--wa-panel-bg)] rounded-lg flex items-center justify-center text-[var(--wa-text-secondary)]">
                                                    <LinkIcon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[var(--wa-text-primary)] text-sm font-medium truncate">{msg.content}</p>
                                                    <p className="text-[var(--wa-text-secondary)] text-xs">{format(new Date(msg.timestamp), 'MMM d, yyyy')}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-[var(--wa-text-secondary)]" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--wa-text-secondary)] p-10 text-center">
                                        <LinkIcon className="w-12 h-12 mb-4 opacity-20" />
                                        <p>No links shared</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>


            {/* Header */}
            <div className="h-16 px-4 bg-[var(--wa-header-bg)] flex items-center gap-4 shrink-0 shadow-sm">
                <Button variant="ghost" size="icon" onClick={onClose} className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-[var(--wa-hover)]">
                    <X className="w-5 h-5" />
                </Button>
                <span className="text-[var(--wa-text-primary)] font-medium text-lg">Contact Info</span>
            </div>

            <div className="flex-1 bg-[var(--wa-app-bg)] w-full overflow-y-auto custom-scrollbar">
                <div className="flex flex-col pb-8">

                    {/* Profile Hero */}
                    <div className="bg-[var(--wa-panel-bg)] p-8 flex flex-col items-center shadow-sm">
                        <Avatar className="w-48 h-48 mb-4 cursor-pointer hover:opacity-90 transition-opacity ring-4 ring-[var(--wa-app-bg)]">
                            <AvatarImage src={displayImage} className="object-cover" />
                            <AvatarFallback className="text-4xl bg-[#6a7f8a] text-white">{displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-2xl font-medium text-[var(--wa-text-primary)] mb-1 text-center">{displayName}</h2>
                        <p className="text-[var(--wa-text-secondary)] text-lg text-center">{displaySub}</p>

                        {!isGroup && (
                            <div className="flex items-center gap-8 mt-8 w-full justify-center">
                                <div
                                    className="flex flex-col items-center gap-2 cursor-pointer group"
                                    onClick={() => startCall(user.id, 'voice')}
                                >
                                    <div className="w-12 h-12 rounded-xl border border-[var(--wa-border)] bg-[var(--wa-header-bg)] flex items-center justify-center group-hover:bg-[var(--wa-hover)] transition-colors text-[var(--wa-primary)]">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs text-[var(--wa-primary)] font-medium">Audio</span>
                                </div>
                                <div
                                    className="flex flex-col items-center gap-2 cursor-pointer group"
                                    onClick={() => startCall(user.id, 'video')}
                                >
                                    <div className="w-12 h-12 rounded-xl border border-[var(--wa-border)] bg-[var(--wa-header-bg)] flex items-center justify-center group-hover:bg-[var(--wa-hover)] transition-colors text-[var(--wa-primary)]">
                                        <Video className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs text-[var(--wa-primary)] font-medium">Video</span>
                                </div>
                                <div
                                    className="flex flex-col items-center gap-2 cursor-pointer group"
                                    onClick={onSearch}
                                >
                                    <div className="w-12 h-12 rounded-xl border border-[var(--wa-border)] bg-[var(--wa-header-bg)] flex items-center justify-center group-hover:bg-[var(--wa-hover)] transition-colors text-[var(--wa-primary)]">
                                        <Search className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs text-[var(--wa-primary)] font-medium">Search</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-2 bg-[var(--wa-app-bg)]" />

                    {/* Group Members (If Group) */}
                    {isGroup && relevantChat && (
                        <>
                            <div className="bg-[var(--wa-panel-bg)] p-4 px-6 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-[var(--wa-text-secondary)] font-medium">{relevantChat.participants.length} members</span>
                                    <Search className="w-5 h-5 text-[var(--wa-text-secondary)] cursor-pointer" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    {relevantChat.participants.map(member => (
                                        <div key={member.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-[var(--wa-hover)] -mx-4 px-4 transition-colors">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={member.avatar} />
                                                <AvatarFallback className="bg-[#6a7f8a] text-white">{member.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[var(--wa-text-primary)] font-medium text-[15px]">{member.id === currentUser?.id ? 'You' : member.name}</span>
                                                    {member.role === 'admin' && <span className="text-[10px] bg-[var(--wa-primary)]/10 text-[var(--wa-primary)] px-1.5 py-0.5 rounded border border-[var(--wa-primary)]/20">Admin</span>}
                                                </div>
                                                <p className="text-xs text-[var(--wa-text-secondary)]">{member.about || "Available"}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="h-2 bg-[var(--wa-app-bg)]" />
                        </>
                    )}

                    {/* About */}
                    {!isGroup && (
                        <>
                            <div className="bg-[var(--wa-panel-bg)] p-4 px-6 shadow-sm hover:bg-[var(--wa-hover)] transition-colors cursor-pointer">
                                <h4 className="text-sm text-[var(--wa-text-secondary)] mb-1 font-medium">About</h4>
                                <p className="text-[var(--wa-text-primary)] text-[15px]">{user.about || "Hey there! I am using Voca."}</p>
                                <p className="text-xs text-[var(--wa-text-secondary)] mt-1">{format(new Date(user.joinedAt || new Date()), 'MMMM d, yyyy')}</p>
                            </div>

                            <div className="bg-[var(--wa-panel-bg)] p-4 px-6 shadow-sm hover:bg-[var(--wa-hover)] transition-colors cursor-pointer border-t border-[var(--wa-border)]">
                                <h4 className="text-sm text-[var(--wa-text-secondary)] mb-1 font-medium">Email</h4>
                                <p className="text-[var(--wa-text-primary)] text-[17px]">{user.email}</p>
                                <p className="text-xs text-[var(--wa-text-secondary)] mt-1">Personal</p>
                            </div>

                            <div className="h-2 bg-[var(--wa-app-bg)]" />
                        </>
                    )}

                    {/* Media & Links */}
                    <div className="bg-[var(--wa-panel-bg)] p-4 px-6 shadow-sm cursor-pointer hover:bg-[var(--wa-hover)] transition-colors" onClick={() => setShowMedia(true)}>
                        <div className="flex items-center justify-between mb-4 pointer-events-none">
                            <span className="text-sm text-[var(--wa-text-secondary)] font-medium">Media, links and docs</span>
                            <span className="text-xs text-[var(--wa-text-secondary)] flex items-center gap-1">
                                {mediaMessages.length + docMessages.length + linkMessages.length} <ChevronRight className="w-4 h-4" />
                            </span>
                        </div>
                        {mediaMessages.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 pointer-events-none">
                                {mediaMessages.slice(0, 3).map(msg => (
                                    <div key={msg.id} className="aspect-square bg-[var(--wa-hover)] rounded-lg overflow-hidden relative">
                                        <img src={msg.mediaUrl} className="w-full h-full object-cover" alt="media" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[var(--wa-text-secondary)] text-sm italic">No media shared</div>
                        )}
                    </div>

                    <div className="h-2 bg-[var(--wa-app-bg)]" />

                    {/* Actions */}
                    <div className="bg-[var(--wa-panel-bg)] p-2 shadow-sm">
                        <div className="flex items-center justify-between p-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors rounded-lg">
                            <div className="flex items-center gap-4 text-[var(--wa-text-primary)]">
                                <Bell className="w-5 h-5 text-[var(--wa-text-secondary)]" />
                                <span className="text-[15px]">Mute notifications</span>
                            </div>
                            <Switch checked={isMuted} onCheckedChange={setIsMuted} className="data-[state=checked]:bg-[var(--wa-primary)]" />
                        </div>
                        <div className="flex items-center gap-4 p-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors rounded-lg text-[var(--wa-text-primary)]" onClick={() => setShowStarred(true)}>
                            <Star className="w-5 h-5 text-[var(--wa-text-secondary)]" />
                            <div className="flex-1 flex justify-between items-center">
                                <span className="text-[15px]">Starred messages</span>
                                {starredMessages.length > 0 && <span className="text-xs text-[var(--wa-text-secondary)]">{starredMessages.length}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors rounded-lg text-[var(--wa-text-primary)]">
                            <Lock className="w-5 h-5 text-[var(--wa-text-secondary)]" />
                            <div className="flex-1">
                                <span className="text-[15px] block">Encryption</span>
                                <span className="text-xs text-[var(--wa-text-secondary)]">Messages and calls are end-to-end encrypted.</span>
                            </div>
                        </div>
                    </div>

                    {/* Common Groups - Hidden until real group data is available */}

                    {/* Ad Space */}
                    {sidebarAd && (
                        <div className="m-4 rounded-lg overflow-hidden bg-[var(--wa-header-bg)] border border-[var(--wa-border)]">
                            <div className="relative h-32 w-full">
                                <img src={sidebarAd.imageUrl} alt={sidebarAd.title} className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white uppercase tracking-wider">Ad</div>
                            </div>
                            <div className="p-3">
                                <h4 className="text-[var(--wa-text-primary)] font-medium text-sm">{sidebarAd.title}</h4>
                                <p className="text-[var(--wa-text-secondary)] text-xs mt-1">{sidebarAd.content}</p>
                                <Button size="sm" variant="outline" className="w-full mt-3 border-[var(--wa-primary)] text-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/10 h-7 text-xs">
                                    Learn More
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="h-2 bg-[var(--wa-app-bg)]" />

                    {/* Danger Zone */}
                    <div className="bg-[var(--wa-panel-bg)] p-2 shadow-sm">
                        <div
                            className="flex items-center gap-4 p-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors rounded-lg text-red-400 hover:text-red-300"
                            onClick={handleBlock}
                        >
                            <Ban className="w-5 h-5" />
                            <span className="text-[15px]">Block {displayName}</span>
                        </div>
                        <div
                            className="flex items-center gap-4 p-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors rounded-lg text-red-400 hover:text-red-300"
                            onClick={() => {
                                createReport({ reporterId: 'me', reportedUserId: user.id, reason: 'User report from contact info' });
                                toast.success("User reported");
                            }}
                        >
                            <ThumbsDown className="w-5 h-5" />
                            <span className="text-[15px]">Report {displayName}</span>
                        </div>
                        <div
                            className="flex items-center gap-4 p-4 hover:bg-[var(--wa-hover)] cursor-pointer transition-colors rounded-lg text-red-400 hover:text-red-300"
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="text-[15px]">Delete chat</span>
                        </div>
                    </div>

                    <div className="h-8 bg-[var(--wa-app-bg)]" />

                </div>
            </div>
        </div>
    );
};
