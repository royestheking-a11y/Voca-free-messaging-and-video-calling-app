import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Ban, Flag, User, Mail, X, Shield } from 'lucide-react';

interface SafetyToolsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    contact: {
        id: string;
        name: string;
        avatar?: string;
        email?: string;
    };
    onBlock: () => void;
    onReport: () => void;
}

export const SafetyToolsDialog = ({ isOpen, onClose, contact, onBlock, onReport }: SafetyToolsDialogProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-[#1f2c34] border-[#0f1c24] text-[#e9edef] max-w-md p-0 overflow-hidden gap-0 rounded-2xl shadow-2xl">
                <DialogHeader className="p-5 border-b border-[#2a3942] flex flex-row items-center justify-between space-y-0 bg-[#202c33]">
                    <DialogTitle className="text-xl font-medium text-[#e9edef]">Safety tools</DialogTitle>
                     <DialogDescription className="sr-only">
                        Manage safety settings and tools for this contact.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-0 overflow-y-auto max-h-[80vh]">
                    <div className="p-6 pb-2">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-[#0f1c24] p-3 rounded-full">
                                <Shield className="w-8 h-8 text-[#00a884]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-[#e9edef]">Report or Block</h3>
                                <p className="text-[#8696a0] text-sm">Decide how to handle this contact.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <button 
                            className="flex items-center gap-4 px-6 py-4 hover:bg-[#111b21] transition-colors text-left border-t border-[#2a3942]"
                            onClick={onBlock}
                        >
                            <div className="w-10 h-10 rounded-full bg-[#f15c6d]/10 flex items-center justify-center shrink-0">
                                <Ban className="w-5 h-5 text-[#f15c6d]" />
                            </div>
                            <div className="flex-1">
                                <span className="text-[#f15c6d] text-[17px] font-medium block">Block {contact.name}</span>
                                <span className="text-[#8696a0] text-sm">They won't be able to call or message you.</span>
                            </div>
                        </button>
                        <button 
                            className="flex items-center gap-4 px-6 py-4 hover:bg-[#111b21] transition-colors text-left border-t border-[#2a3942]"
                            onClick={onReport}
                        >
                            <div className="w-10 h-10 rounded-full bg-[#f15c6d]/10 flex items-center justify-center shrink-0">
                                <Flag className="w-5 h-5 text-[#f15c6d]" />
                            </div>
                            <div className="flex-1">
                                <span className="text-[#f15c6d] text-[17px] font-medium block">Report {contact.name}</span>
                                <span className="text-[#8696a0] text-sm">Report this contact to Voca for review.</span>
                            </div>
                        </button>
                    </div>

                    <div className="p-6 bg-[#111b21]/50">
                        <h3 className="text-sm font-bold text-[#8696a0] uppercase tracking-wider mb-4">Safety Tips</h3>

                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <User className="w-5 h-5 text-[#8696a0] shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <span className="text-[#e9edef] font-medium block mb-0.5">Profile Info</span>
                                    <span className="text-[#8696a0]">Profile photos and names are set by the user and not verified.</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Mail className="w-5 h-5 text-[#8696a0] shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <span className="text-[#e9edef] font-medium block mb-0.5">Check details</span>
                                    <span className="text-[#8696a0]">Ensure the email address or phone number matches who you expect.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
