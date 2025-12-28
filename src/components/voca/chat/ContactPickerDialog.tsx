import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { ScrollArea } from '../../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Search } from 'lucide-react';
import { useVoca } from '../VocaContext';
import { User } from '../../../lib/data';

interface ContactPickerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (userId: string) => void;
    title?: string;
}

export const ContactPickerDialog = ({ isOpen, onClose, onSelect, title = "Select Contact" }: ContactPickerDialogProps) => {
    const { users, currentUser } = useVoca();
    const [searchTerm, setSearchTerm] = useState('');

    const availableUsers = users.filter(u => u.id !== currentUser?.id);
    const filteredUsers = availableUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-md p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b border-[var(--wa-border)]">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="sr-only">Select a contact to perform this action.</DialogDescription>
                </DialogHeader>

                <div className="p-2 px-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--wa-text-secondary)]" />
                        <Input
                            placeholder="Search contacts..."
                            className="pl-9 bg-[var(--wa-header-bg)] border-none text-[var(--wa-text-primary)] h-9 placeholder:text-[var(--wa-text-secondary)]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="p-2">
                        {filteredUsers.map(user => (
                            <div
                                key={user.id}
                                onClick={() => {
                                    onSelect(user.id);
                                    onClose();
                                }}
                                className="flex items-center gap-3 p-3 hover:bg-[var(--wa-hover)] cursor-pointer rounded-lg transition-colors"
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h3 className="text-[var(--wa-text-primary)] font-medium">{user.name}</h3>
                                    <p className="text-[var(--wa-text-secondary)] text-xs">{user.about || 'Available'}</p>
                                </div>
                            </div>
                        ))}
                        {filteredUsers.length === 0 && (
                            <div className="p-4 text-center text-[var(--wa-text-secondary)] text-sm">
                                No contacts found
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
