import React, { useState } from 'react';
import { X, Calendar, MapPin, Video, Send, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { Switch } from '../../ui/switch';
import { Dialog, DialogContent } from '../../ui/dialog';

interface CreateEventDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (eventData: any) => void;
}

export const CreateEventDialog = ({ isOpen, onClose, onSend }: CreateEventDialogProps) => {
    const [eventName, setEventName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [displayDate, setDisplayDate] = useState('Jan 14, 2026'); // Default matching screenshot for now, usually use real date
    const [displayTime, setDisplayTime] = useState('7:30 PM');
    const [isVocaCall, setIsVocaCall] = useState(false);
    const [allowGuests, setAllowGuests] = useState(false);

    // Dark theme matching the screenshot
    // Background: #0f1c24 (approx dark slate) or #111b21 (standard WA dark)
    // Inputs: Transparent with placeholder styling
    // Text: White / Gray

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="p-0 border-none bg-[#111b21] text-[#e9edef] max-w-md w-full rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center p-4 gap-4 border-b border-white/10">
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-[#8696a0]" />
                    </button>
                    <h2 className="text-xl font-medium tracking-wide flex-1">Create Event</h2>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">

                    {/* Name & Desc */}
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Event name"
                            className="w-full bg-transparent text-2xl font-semibold placeholder-[#8696a0] outline-none border-none p-0 focus:ring-0"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            autoFocus
                        />
                        <input
                            type="text"
                            placeholder="Description (Optional)"
                            className="w-full bg-transparent text-base text-[#d1d7db] placeholder-[#8696a0] outline-none border-none p-0 focus:ring-0"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="h-px bg-white/10 w-full" />

                    {/* Date & Time */}
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <Calendar className="w-6 h-6 text-[#8696a0] mt-1" />
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-2 -ml-2 rounded-lg transition-colors">
                                    <span className="text-base text-[#e9edef]">{displayDate}</span>
                                    <span className="text-base text-[#e9edef]">{displayTime}</span>
                                </div>
                                <button className="text-[#00a884] text-sm font-medium hover:text-[#00c897] transition-colors">
                                    Add end time
                                </button>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-4">
                            <MapPin className="w-6 h-6 text-[#8696a0]" />
                            <input
                                type="text"
                                placeholder="Add location"
                                className="flex-1 bg-transparent text-base text-[#e9edef] placeholder-[#8696a0] outline-none border-none p-2 -ml-2 focus:ring-0 rounded-lg focus:bg-white/5 transition-colors"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>

                        {/* Voca Call Link */}
                        <div className="flex items-center gap-4 justify-between">
                            <div className="flex items-center gap-4">
                                <Video className="w-6 h-6 text-[#8696a0]" />
                                <span className="text-base text-[#e9edef]">Voca call link</span>
                            </div>
                            <Switch
                                checked={isVocaCall}
                                onCheckedChange={setIsVocaCall}
                                className="data-[state=checked]:bg-[#00a884] data-[state=unchecked]:bg-[#37404a]"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-white/10 w-full" />

                    {/* Guest Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-base text-[#e9edef]">Allow guests</span>
                            <span className="text-xs text-[#8696a0]">Allow people to bring one additional guest</span>
                        </div>
                        <Switch
                            checked={allowGuests}
                            onCheckedChange={setAllowGuests}
                            className="data-[state=checked]:bg-[#00a884] data-[state=unchecked]:bg-[#37404a]"
                        />
                    </div>

                </div>

                {/* Footer / Send Button */}
                <div className="p-4 flex justify-end">
                    <button
                        onClick={() => {
                            if (!eventName) return;
                            onSend({ eventName, description, date: displayDate, time: displayTime, location, isVocaCall, allowGuests });
                            onClose();
                        }}
                        disabled={!eventName}
                        className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95",
                            eventName ? "bg-[#00a884] hover:bg-[#008f72] text-[#111b21]" : "bg-[#37404a] text-[#8696a0] cursor-not-allowed"
                        )}
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
