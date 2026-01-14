import React from 'react';
import { Image, Camera, MapPin, User, FileText, Headphones, BarChart2, Calendar } from 'lucide-react';

interface AttachmentMenuProps {
    onSelect: (type: 'image' | 'camera' | 'location' | 'contact' | 'document' | 'audio' | 'poll' | 'event') => void;
}

const MENU_ITEMS = [
    { id: 'image', label: 'Gallery', icon: Image, color: '#007bfc' }, // Blue
    { id: 'camera', label: 'Camera', icon: Camera, color: '#ff2e74' }, // Pink/Red
    { id: 'location', label: 'Location', icon: MapPin, color: '#00c853' }, // Green
    { id: 'contact', label: 'Contact', icon: User, color: '#009de2' }, // Light Blue
    { id: 'document', label: 'Document', icon: FileText, color: '#5f66cd' }, // Purple
    { id: 'audio', label: 'Audio', icon: Headphones, color: '#ff5722' }, // Orange
    { id: 'poll', label: 'Poll', icon: BarChart2, color: '#ffbc00' }, // Yellow
    { id: 'event', label: 'Event', icon: Calendar, color: '#ec407a' }, // Pink
] as const;

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ onSelect }) => {
    return (
        <div className="p-2 bg-[var(--wa-panel-bg)] w-fit">
            <div
                className="grid gap-y-4 gap-x-4 justify-items-center"
                style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
            >
                {MENU_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.id as any)}
                        className="flex flex-col items-center gap-1.5 group w-full rounded-xl transition-colors hover:bg-white/5 active:bg-white/10 p-1"
                    >
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform shadow-sm group-active:scale-95 border border-white/5"
                            style={{
                                backgroundColor: 'var(--wa-input-bg)', // Adapts to theme (dark/light) - Screenshots show dark square
                            }}
                        >
                            <item.icon
                                className="w-8 h-8"
                                style={{ color: item.color }}
                                strokeWidth={2}
                            />
                        </div>
                        <span className="text-[12px] font-medium text-[var(--wa-text-secondary)] tracking-wide group-hover:text-[var(--wa-text-primary)] text-center">
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
