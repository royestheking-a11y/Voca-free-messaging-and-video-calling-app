import React, { useState } from 'react';
import { X, Plus, GripVertical, Send } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { Switch } from '../../ui/switch';
import { Dialog, DialogContent } from '../../ui/dialog';

interface CreatePollDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (question: string, options: string[], multipleAnswers: boolean) => void;
}

export const CreatePollDialog = ({ isOpen, onClose, onSend }: CreatePollDialogProps) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']); // Start with 2 empty options
    const [allowMultiple, setAllowMultiple] = useState(true);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);

        // Auto-add new option field if typing in the last one
        if (index === options.length - 1 && value.trim()) {
            setOptions([...newOptions, '']);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (options.length <= 2) {
            // Don't remove if only 2 options, just clear it
            const newOptions = [...options];
            newOptions[index] = '';
            setOptions(newOptions);
            return;
        }
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    // Filter out empty options for sending, except we need at least 2 valid ones
    const validOptions = options.filter(opt => opt.trim().length > 0);
    const isValid = question.trim().length > 0 && validOptions.length >= 2;

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="p-0 border-none bg-[#111b21] text-[#e9edef] max-w-md w-full rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center p-4 gap-4">
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-[#8696a0]" />
                    </button>
                    <h2 className="text-xl font-medium tracking-wide flex-1">Create poll</h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">

                    {/* Question */}
                    <div className="space-y-4">
                        <label className="text-[#00a884] font-medium text-sm ml-1">Question</label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Ask question"
                                className="w-full bg-[#202c33] text-base text-[#e9edef] placeholder-[#8696a0] rounded-lg p-4 border-b-2 border-transparent focus:border-[#00a884] outline-none transition-all"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-4">
                        <label className="text-[#8696a0] font-medium text-sm ml-1">Options</label>
                        <div className="space-y-3">
                            {options.map((opt, index) => (
                                <div key={index} className="flex items-center gap-2 group animate-in slide-in-from-left-2 duration-200">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            placeholder="+ Add"
                                            className="w-full bg-[#202c33] text-base text-[#e9edef] placeholder-[#8696a0] rounded-lg p-4 border-b-2 border-transparent focus:border-[#00a884] outline-none transition-all"
                                            value={opt}
                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                        />
                                        {/* Grip Icon for reordering (visual only for now) */}
                                        {opt && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8696a0]">
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-white/5 w-full" />

                    {/* Multiple Answers Toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-base text-[#e9edef]">Allow multiple answers</span>
                        <Switch
                            checked={allowMultiple}
                            onCheckedChange={setAllowMultiple}
                            className="data-[state=checked]:bg-[#00a884] data-[state=unchecked]:bg-[#37404a]"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 flex justify-end">
                    <button
                        onClick={() => {
                            if (!isValid) return;
                            onSend(question, validOptions, allowMultiple);
                            onClose();
                        }}
                        disabled={!isValid}
                        className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95",
                            isValid ? "bg-[#00a884] hover:bg-[#008f72] text-[#111b21]" : "bg-[#37404a] text-[#8696a0] cursor-not-allowed"
                        )}
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
