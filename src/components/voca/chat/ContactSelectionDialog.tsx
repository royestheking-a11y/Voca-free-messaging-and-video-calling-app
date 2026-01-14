import React, { useState } from 'react';
import { useVoca } from '../VocaContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Search, X, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { ScrollArea } from '../../ui/scroll-area';
import { User } from '../../../lib/data';
import { Button } from '../../ui/button';

interface ContactSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (user: User) => void;
}

export const ContactSelectionDialog = ({ isOpen, onClose, onSelect }: ContactSelectionDialogProps) => {
    const { users, currentUser, chats } = useVoca();
    const [searchQuery, setSearchQuery] = useState('');

    // Get IDs of people user has interacted with (from chats)
    const knownContactIds = React.useMemo(() => {
        const ids = new Set<string>();
        chats.forEach(chat => {
            chat.participants.forEach(p => {
                if (p.id !== currentUser?.id) ids.add(p.id);
            });
        });
        currentUser?.favorites?.forEach(id => ids.add(id));
        return ids;
    }, [chats, currentUser]);

    const filteredUsers = users
        .filter(u =>
            u.id !== currentUser?.id &&
            !currentUser?.blockedUsers?.includes(u.id) &&
            knownContactIds.has(u.id) && // Only show known contacts
            !u.blockedUsers?.includes(currentUser?.id || '') &&
            (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-md p-0 h-[85vh] md:h-[600px] overflow-hidden block">
                <div className="flex flex-col h-full w-full">
                    <DialogHeader className="p-4 bg-[var(--wa-header-bg)] border-b border-[var(--wa-border)] shrink-0 flex-row items-center gap-3 space-y-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-[var(--wa-text-primary)]" onClick={onClose}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <DialogTitle className="text-lg font-medium">Share Contact</DialogTitle>
                        <DialogDescription className="sr-only">Select a contact to share.</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-2 bg-[var(--wa-app-bg)] shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--wa-text-secondary)]" />
                                <Input
                                    placeholder="Search contacts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-[var(--wa-header-bg)] border-none text-[var(--wa-text-primary)] h-9 focus-visible:ring-1 ring-[var(--wa-primary)]"
                                />
                            </div>
                        </div>

                        <ScrollArea className="flex-1 bg-[var(--wa-app-bg)] min-h-0">
                            <div className="pb-4">
                                {filteredUsers.length > 0 ? (
                                    <div className="py-2">
                                        <div className="px-4 py-2 text-[var(--wa-primary)] text-xs font-bold uppercase tracking-wider">Contacts</div>
                                        {filteredUsers.map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => {
                                                    onSelect(user);
                                                    onClose();
                                                }}
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
                                        <p>No contacts found.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
