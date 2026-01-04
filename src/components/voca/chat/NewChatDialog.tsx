import React, { useState } from 'react';
import { useVoca } from '../VocaContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Search, UserPlus, X, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { ScrollArea } from '../../ui/scroll-area';
import { toast } from 'sonner';

interface NewChatDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NewChatDialog = ({ isOpen, onClose }: NewChatDialogProps) => {
    const { users, createChat, currentUser, addUser, toggleFavoriteContact } = useVoca();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');

    const filteredUsers = searchQuery
        ? users
            .filter(u =>
                u.id !== currentUser?.id &&
                !currentUser?.blockedUsers?.includes(u.id) &&
                !u.blockedUsers?.includes(currentUser?.id || '') &&
                u.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];

    const handleCreateChat = (userId: string) => {
        createChat(userId);
        onClose();
    };

    const handleAddNewUser = () => {
        if (!newUserEmail || !newUserName) return;

        // Check if user already exists
        const existingUser = users.find(u => u.email.toLowerCase() === newUserEmail.toLowerCase());

        if (existingUser) {
            // Check if blocked
            const isBlocked = currentUser?.blockedUsers?.includes(existingUser.id) || existingUser.blockedUsers?.includes(currentUser?.id || '');
            if (isBlocked) {
                // Act as if not found
                toast.error("User not found", { description: "The email address is not registered on Voca." });
                return;
            }

            // Check if already in favorites, if not add them
            if (!currentUser?.favorites?.includes(existingUser.id)) {
                toggleFavoriteContact(existingUser.id);
            }

            createChat(existingUser.id);
            toast.success(`${existingUser.name} saved to contacts!`);
            onClose();
            // Reset state
            setIsAddingUser(false);
            setNewUserEmail('');
            setNewUserName('');
            setSearchQuery('');
            return;
        }

        // Rule: Only add if user exists in Voca DB
        toast.error("User not found", { description: "The email address is not registered on Voca." });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-md p-0 h-[85vh] md:h-[600px] flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="p-4 bg-[var(--wa-header-bg)] border-b border-[var(--wa-border)]">
                    <DialogTitle>New Chat</DialogTitle>
                    <DialogDescription className="sr-only">Search for a user or add a new contact to start chatting.</DialogDescription>
                </DialogHeader>

                {isAddingUser ? (
                    <div className="flex-1 p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Button variant="ghost" size="icon" onClick={() => setIsAddingUser(false)} className="-ml-2">
                                <X className="w-5 h-5" />
                            </Button>
                            <h3 className="font-medium text-lg">Add New Contact</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-[var(--wa-text-secondary)] block mb-1">Name</label>
                                <Input
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="bg-[var(--wa-input-bg)] border-none text-[var(--wa-text-primary)]"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-[var(--wa-text-secondary)] block mb-1">Email</label>
                                <Input
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="bg-[var(--wa-input-bg)] border-none text-[var(--wa-text-primary)]"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <Button onClick={handleAddNewUser} className="w-full bg-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/90 text-[#111b21] font-medium mt-4">
                                Save Contact
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-2 bg-[var(--wa-app-bg)]">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--wa-text-secondary)]" />
                                <Input
                                    placeholder="Search email"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-[var(--wa-header-bg)] border-none text-[var(--wa-text-primary)] h-9 focus-visible:ring-1 ring-[var(--wa-primary)]"
                                />
                            </div>
                        </div>

                        <div
                            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[var(--wa-hover)] transition-colors border-b border-[var(--wa-border)]"
                            onClick={() => setIsAddingUser(true)}
                        >
                            <div className="w-10 h-10 rounded-full bg-[var(--wa-primary)] flex items-center justify-center text-[#111b21]">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[var(--wa-text-primary)] font-medium">New Contact</h3>
                                <p className="text-[var(--wa-text-secondary)] text-xs">Add a new person to chat with</p>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 bg-[var(--wa-app-bg)] min-h-0">
                            <div className="pb-4">
                                {filteredUsers.length > 0 ? (
                                    <div className="py-2">
                                        <div className="px-4 py-2 text-[var(--wa-primary)] text-xs font-bold uppercase tracking-wider">Search Results</div>
                                        {filteredUsers.map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => handleCreateChat(user.id)}
                                                className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-[var(--wa-hover)] transition-colors"
                                            >
                                                <Avatar>
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <h3 className="text-[var(--wa-text-primary)] font-medium">{user.name}</h3>
                                                    <p className="text-[var(--wa-text-secondary)] text-sm line-clamp-1">{user.about || "Hey there! I am using Voca."}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-[var(--wa-text-secondary)] p-6 text-center">
                                        {searchQuery ? (
                                            <>
                                                <p>No users found.</p>
                                                <p className="text-sm mt-1">Try a different email.</p>
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-8 h-8 opacity-20 mb-2" />
                                                <p>Search for a user to start chatting</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
