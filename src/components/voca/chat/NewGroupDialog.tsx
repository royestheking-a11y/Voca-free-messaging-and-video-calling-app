import React, { useState } from 'react';
import { useVoca } from '../VocaContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Search, X, Check, ArrowLeft, Camera, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { ScrollArea } from '../../ui/scroll-area';
import { toast } from 'sonner';

interface NewGroupDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NewGroupDialog = ({ isOpen, onClose }: NewGroupDialogProps) => {
    // Show users from existing chats AND favorites for group creation
    const { users, createGroupChat, currentUser, chats } = useVoca();
    const [step, setStep] = useState<'participants' | 'info'>('participants');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [groupName, setGroupName] = useState('');
    const [groupImage, setGroupImage] = useState<string | null>(null);

    // Get all users the current user has chatted with + favorites
    const chatContactIds = chats
        .filter(chat => !chat.isGroup && chat.participants.some(p => p.id === currentUser?.id))
        .flatMap(chat => chat.participants.filter(p => p.id !== currentUser?.id).map(p => p.id));

    const favoriteIds = currentUser?.favorites || [];
    const allContactIds = [...new Set([...chatContactIds, ...favoriteIds])]; // Combine and dedupe

    const availableUsers = users.filter(u =>
        u.id !== currentUser?.id && allContactIds.includes(u.id)
    );
    const filteredUsers = availableUsers.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));

    const toggleUser = (userId: string) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            toast.loading('Uploading image...', { id: 'group-image' });
            try {
                const { uploadAPI } = await import('../../../lib/api');
                const result = await uploadAPI.image(file);
                setGroupImage(result.url);
                toast.success('Image uploaded', { id: 'group-image' });
            } catch (error: any) {
                console.error('Upload error:', error);
                toast.error(`Upload failed: ${error.message}`, { id: 'group-image' });
            }
        }
    };

    const handleCreate = () => {
        if (!groupName.trim()) {
            toast.error("Please enter a group subject");
            return;
        }
        createGroupChat(groupName, selectedUsers, groupImage || undefined);
        toast.success("Group created!");
        handleClose();
    };

    const handleClose = () => {
        onClose();
        // Reset state after transition for better UX
        setTimeout(() => {
            setStep('participants');
            setSelectedUsers([]);
            setGroupName('');
            setGroupImage(null);
            setSearchQuery('');
        }, 300);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-md p-0 h-[600px] flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="p-4 bg-[var(--wa-header-bg)] border-b border-[var(--wa-border)] flex-row items-center gap-4 space-y-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={step === 'participants' ? handleClose : () => setStep('participants')}
                        className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] -ml-2 hover:bg-transparent"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <DialogTitle className="text-lg font-medium">{step === 'participants' ? 'Add Members' : 'New Group'}</DialogTitle>
                        <DialogDescription className="sr-only">Create a new group chat</DialogDescription>
                        {step === 'participants' && (
                            <p className="text-xs text-[var(--wa-text-secondary)]">{selectedUsers.length} selected</p>
                        )}
                        {step === 'info' && (
                            <p className="text-xs text-[var(--wa-text-secondary)]">Add subject</p>
                        )}
                    </div>
                </DialogHeader>

                {step === 'participants' ? (
                    <>
                        <div className="p-2 bg-[var(--wa-app-bg)]">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--wa-text-secondary)]" />
                                <Input
                                    placeholder="Search name or email"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-[var(--wa-header-bg)] border-none text-[var(--wa-text-primary)] h-9 focus-visible:ring-1 ring-[var(--wa-primary)] placeholder:text-[var(--wa-text-secondary)]"
                                />
                            </div>
                        </div>

                        {/* Selected Users Chips */}
                        {selectedUsers.length > 0 && (
                            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-[var(--wa-border)] min-h-[60px]">
                                {selectedUsers.map(id => {
                                    const user = users.find(u => u.id === id);
                                    return (
                                        <div key={id} className="flex flex-col items-center gap-1 min-w-[60px] animate-in fade-in zoom-in duration-200">
                                            <div className="relative">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={user?.avatar} />
                                                    <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div
                                                    className="absolute -bottom-1 -right-1 bg-[var(--wa-header-bg)] rounded-full p-0.5 border border-[var(--wa-text-secondary)] cursor-pointer hover:bg-[var(--wa-hover)]"
                                                    onClick={(e) => { e.stopPropagation(); toggleUser(id); }}
                                                >
                                                    <X className="w-3 h-3 text-[var(--wa-text-secondary)]" />
                                                </div>
                                            </div>
                                            <span className="text-xs text-[var(--wa-text-primary)] truncate w-full text-center max-w-[60px]">{user?.name.split(' ')[0]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--wa-app-bg)]">
                            <div className="py-2">
                                {filteredUsers.map(user => {
                                    const isSelected = selectedUsers.includes(user.id);
                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleUser(user.id)}
                                            className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-[var(--wa-hover)] transition-colors"
                                        >
                                            <div className="relative">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {isSelected && (
                                                    <div className="absolute -bottom-1 -right-1 bg-[var(--wa-primary)] rounded-full p-0.5 border-2 border-[var(--wa-app-bg)]">
                                                        <Check className="w-3 h-3 text-[#111b21]" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-[var(--wa-text-primary)] font-medium">{user.name}</h3>
                                                <p className="text-[var(--wa-text-secondary)] text-sm line-clamp-1">{user.about || "Available"}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredUsers.length === 0 && (
                                    <div className="p-8 text-center text-[var(--wa-text-secondary)]">
                                        {allContactIds.length === 0
                                            ? "You don't have any contacts yet. Start a chat with someone first to add them here."
                                            : "No contacts found"
                                        }
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--wa-panel-bg)] flex justify-center border-t border-[var(--wa-border)] h-[80px] items-center">
                            {selectedUsers.length > 0 && (
                                <Button
                                    onClick={() => setStep('info')}
                                    className="bg-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/90 rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-lg animate-in zoom-in"
                                >
                                    <div className="w-6 h-6 text-[#111b21]">
                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path></svg>
                                    </div>
                                </Button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col bg-[var(--wa-panel-bg)]">
                        <div className="flex-1 flex flex-col items-center p-8">
                            <label className="relative mb-8 group cursor-pointer block">
                                <div className="w-24 h-24 rounded-full bg-[var(--wa-header-bg)] flex items-center justify-center overflow-hidden border-2 border-[var(--wa-border)]">
                                    {groupImage ? (
                                        <img src={groupImage} className="w-full h-full object-cover" alt="Group" />
                                    ) : (
                                        <Users className="w-10 h-10 text-[var(--wa-text-secondary)]" />
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <Camera className="w-8 h-8 text-white mb-1" />
                                    <span className="text-[10px] text-white uppercase font-bold tracking-wide">
                                        {groupImage ? 'CHANGE' : 'ADD PHOTO'}
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleImageUpload}
                                />
                            </label>

                            <div className="w-full space-y-4">
                                <div className="relative">
                                    <Input
                                        placeholder="Group Subject"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="bg-transparent border-b-2 border-[var(--wa-primary)] border-t-0 border-x-0 rounded-none px-0 text-lg text-[var(--wa-text-primary)] focus-visible:ring-0 placeholder:text-[var(--wa-text-secondary)] pb-2"
                                        autoFocus
                                        maxLength={25}
                                    />
                                    <span className="absolute right-0 bottom-2 text-xs text-[var(--wa-text-secondary)]">{25 - groupName.length}</span>
                                </div>
                                <p className="text-xs text-[var(--wa-text-secondary)]">Provide a group subject and optional group icon</p>
                            </div>

                            <div className="mt-8 w-full bg-[var(--wa-header-bg)] rounded-lg p-3">
                                <p className="text-xs text-[var(--wa-text-secondary)] mb-2 uppercase font-medium tracking-wide">Participants: {selectedUsers.length}</p>
                                <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                                    {selectedUsers.map(id => {
                                        const u = users.find(user => user.id === id);
                                        return <span key={id} className="text-xs bg-[var(--wa-panel-bg)] px-2 py-1 rounded text-[var(--wa-text-primary)] border border-[var(--wa-border)]">{u?.name}</span>
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--wa-panel-bg)] flex justify-center border-t border-[var(--wa-border)] h-[80px] items-center">
                            <Button
                                onClick={handleCreate}
                                disabled={!groupName.trim()}
                                className="bg-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/90 rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check className="w-6 h-6 text-[#111b21]" />
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
