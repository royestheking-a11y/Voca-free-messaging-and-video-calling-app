import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { Shield, Ban, UserPlus } from 'lucide-react';

interface UnknownContactCardProps {
    contact: {
        id: string;
        name: string;
        avatar?: string;
        email?: string;
    };
    onBlock: () => void;
    onAdd: () => void;
    onSafetyTools: () => void;
}

export const UnknownContactCard = ({ contact, onBlock, onAdd, onSafetyTools }: UnknownContactCardProps) => {
    return (
        <div className="w-full max-w-md mx-auto my-6 bg-[var(--wa-panel-bg)]/95 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-[var(--wa-border)] animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
                <div className="flex flex-col items-center gap-3 mb-5">
                     <Avatar className="w-16 h-16 ring-2 ring-[var(--wa-panel-bg)] shadow-sm">
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback className="bg-[var(--wa-header-bg)] text-[var(--wa-text-primary)] text-xl font-medium">
                            {contact.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                        <h2 className="text-[17px] font-semibold text-[var(--wa-text-primary)] leading-tight">
                            {contact.email || contact.name}
                        </h2>
                        {contact.email && (
                            <p className="text-[var(--wa-text-secondary)] text-sm">
                                ~{contact.name}
                            </p>
                        )}
                        <p className="text-[var(--wa-text-secondary)] text-xs font-medium bg-[var(--wa-header-bg)] px-2 py-0.5 rounded-full inline-block mt-1 border border-[var(--wa-border)]">
                            Not in your contacts
                        </p>
                    </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-3 pt-1">
                     <Button 
                        variant="outline"
                        onClick={onBlock}
                        className="w-full border-[var(--wa-border)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 text-red-400 h-10 rounded-xl text-[15px] font-medium transition-all shadow-sm"
                    >
                        <Ban className="w-4 h-4 mr-2" />
                        Block
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={onAdd}
                        className="w-full border-[var(--wa-border)] hover:bg-[#00a884]/10 hover:text-[#00a884] hover:border-[#00a884]/30 text-[var(--wa-primary)] h-10 rounded-xl text-[15px] font-medium transition-all shadow-sm"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add contact
                    </Button>
                </div>
                
                <button 
                    onClick={onSafetyTools}
                    className="flex items-center gap-1.5 text-[var(--wa-text-secondary)] hover:text-[var(--wa-primary)] text-xs mt-5 transition-colors font-medium group py-1 px-3 rounded-full hover:bg-[var(--wa-header-bg)]"
                >
                    <Shield className="w-3.5 h-3.5 group-hover:text-[var(--wa-primary)] transition-colors" />
                    Safety tools
                </button>
            </div>
        </div>
    );
};
