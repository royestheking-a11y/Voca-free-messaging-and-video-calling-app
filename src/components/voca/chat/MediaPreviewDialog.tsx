import React, { useState, useEffect } from 'react';
import { X, Send, Smile } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Dialog, DialogContent } from '../../ui/dialog';

interface MediaPreviewDialogProps {
    open: boolean;
    file: File | null;
    mediaPrevUrl: string | null; // URL.createObjectURL result
    onClose: () => void;
    onSend: (file: File, caption: string) => void;
}

export const MediaPreviewDialog: React.FC<MediaPreviewDialogProps> = ({ open, file, mediaPrevUrl, onClose, onSend }) => {
    const [caption, setCaption] = useState('');

    // Reset caption when file changes
    useEffect(() => {
        setCaption('');
    }, [file]);

    if (!file || !mediaPrevUrl) return null;

    const isVideo = file.type.startsWith('video/');

    const handleSend = () => {
        onSend(file, caption);
        setCaption(''); // Reset locally but dialog will likely close
    };

    return (
        <Dialog open={open} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="max-w-[80vw] max-h-[90vh] p-0 bg-[#0b141a] border-none text-white overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-black/40 z-10 absolute top-0 w-full">
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full">
                        <X className="w-6 h-6" />
                    </Button>
                    <div className="font-semibold text-lg drop-shadow-md">Preview</div>
                    {/* Placeholder for Crop/Edit tools */}
                    <div className="w-10" />
                </div>

                {/* Media Preview Area */}
                <div className="flex-1 flex items-center justify-center bg-[#0b141a] relative min-h-[50vh]">
                    {isVideo ? (
                        <video
                            src={mediaPrevUrl}
                            controls
                            className="max-w-full max-h-[70vh] object-contain shadow-2xl"
                        />
                    ) : (
                        <img
                            src={mediaPrevUrl}
                            alt="Preview"
                            className="max-w-full max-h-[70vh] object-contain shadow-2xl"
                        />
                    )}
                </div>

                {/* Caption Input Area */}
                <div className="p-3 bg-[#111b21]/90 backdrop-blur-md flex items-center gap-2 border-t border-white/10">
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white rounded-full">
                        <Smile className="w-6 h-6" />
                    </Button>

                    <Input
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="flex-1 bg-[#2a3942] border-none text-white placeholder:text-gray-400 rounded-lg px-4 py-2 ring-0 focus-visible:ring-0"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSend();
                        }}
                        autoFocus
                    />

                    <Button
                        onClick={handleSend}
                        className="bg-[#00a884] hover:bg-[#008f72] text-[#111b21] rounded-full w-12 h-12 flex items-center justify-center shadow-lg transform transition-transform active:scale-95"
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
