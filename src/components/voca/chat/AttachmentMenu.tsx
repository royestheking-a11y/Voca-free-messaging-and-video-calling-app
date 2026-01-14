import React from 'react';
import { Image, Camera, MapPin, User, FileText, Headphones, BarChart2, Calendar } from 'lucide-react';
import { cn } from '../../ui/utils';

interface AttachmentMenuProps {
    onSelect: (type: 'image' | 'camera' | 'location' | 'contact' | 'document' | 'audio' | 'poll' | 'event') => void;
}

const MENU_ITEMS = [
    { id: 'image', label: 'Gallery', icon: Image, color: '#007bfc', bgColor: 'rgba(0, 123, 252, 0.1)' }, // Blue
    { id: 'camera', label: 'Camera', icon: Camera, color: '#ff2e74', bgColor: 'rgba(255, 46, 116, 0.1)' }, // Pink/Red
    { id: 'location', label: 'Location', icon: MapPin, color: '#00c853', bgColor: 'rgba(0, 200, 83, 0.1)' }, // Green
    { id: 'contact', label: 'Contact', icon: User, color: '#009de2', bgColor: 'rgba(0, 157, 226, 0.1)' }, // Light Blue
    { id: 'document', label: 'Document', icon: FileText, color: '#5f66cd', bgColor: 'rgba(95, 102, 205, 0.1)' }, // Purple
    { id: 'audio', label: 'Audio', icon: Headphones, color: '#ff5722', bgColor: 'rgba(255, 87, 34, 0.1)' }, // Orange
    { id: 'poll', label: 'Poll', icon: BarChart2, color: '#ffbc00', bgColor: 'rgba(255, 188, 0, 0.1)' }, // Yellow
    { id: 'event', label: 'Event', icon: Calendar, color: '#ec407a', bgColor: 'rgba(236, 64, 122, 0.1)' }, // Pink
] as const;

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ onSelect }) => {
    return (
        <div className="grid grid-cols-4 gap-4 p-4 min-w-[320px]">
            {MENU_ITEMS.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onSelect(item.id as any)}
                    className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
                >
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-sm group-hover:shadow-md group-hover:scale-105"
                        style={{
                            backgroundColor: 'transparent', // Keeping transparent for now, or match screenshot heavily dark
                            // Screenshot shows distinct colored bubbles. Let's replicate that exact look.
                            // The screenshot has dark bubbles.
                            // Wait, the screenshot shows: Dark background bubbles? No, it looks like colored gradients or solid colors but the whole menu is dark.
                            // Actually, looking closely at the provided screenshot:
                            // The ICONS vary in color.
                            // The ICON CONTAINER (bubble) seems to have a very subtle dark fill or just the menu background.
                            // wait, standard WhatsApp Android attachment menu has COLORED CIRCLES.
                            // The USER SCREENSHOT has: Dark Squares with Colored Icons.
                            // Let's match the screenshot: Dark Grey/Black rounded square, with Colored Icon.
                        }}
                    >
                        {/* We will use a consistent dark bg for the container, and color the icon */}
                        <div className="w-16 h-16 rounded-[24px] bg-[#1e2b32] flex items-center justify-center mb-1 hover:bg-[#2a3942] transition-colors border border-white/5">
                            <item.icon
                                className="w-8 h-8"
                                style={{ color: item.color }}
                                strokeWidth={2.5}
                            />
                        </div>
                    </div>
                    <span className="text-[13px] font-medium text-[var(--wa-text-secondary)] tracking-wide group-hover:text-[var(--wa-text-primary)]">
                        {item.label}
                    </span>
                </button>
            ))}
        </div>
    );
};
