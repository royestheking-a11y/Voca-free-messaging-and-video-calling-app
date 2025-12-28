import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { useVoca } from '../VocaContext';
import { Image as ImageIcon, Type, Send } from 'lucide-react';
import { toast } from 'sonner';

interface CreateStatusDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateStatusDialog = ({ isOpen, onClose, initialMode = 'text' }: { isOpen: boolean; onClose: () => void; initialMode?: 'text' | 'image' }) => {
    const { createStatus } = useVoca();
    const [activeTab, setActiveTab] = useState<'text' | 'image'>(initialMode);

    React.useEffect(() => {
        if (isOpen) setActiveTab(initialMode);
    }, [isOpen, initialMode]);

    const [text, setText] = useState('');
    const [bgColor, setBgColor] = useState('#005c4b');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const colors = ['#005c4b', '#0b141a', '#541c1c', '#1c3a54', '#541c4f'];

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            toast.loading('Uploading image...', { id: 'status-image' });
            try {
                const { uploadAPI } = await import('../../../lib/api');
                const result = await uploadAPI.image(file);
                setImagePreview(result.url);
                setActiveTab('image');
                toast.success('Image uploaded', { id: 'status-image' });
            } catch (error: any) {
                console.error('Upload error:', error);
                toast.error(`Upload failed: ${error.message}`, { id: 'status-image' });
            }
        }
    };

    const handleSubmit = () => {
        if (activeTab === 'text') {
            if (!text.trim()) return;
            createStatus(text, 'text', bgColor);
            toast.success("Status update posted!");
        } else {
            if (!imagePreview) return;
            // Pass the image URL (from blob or data URI) as content
            createStatus(imagePreview, 'image');
            toast.success("Photo status posted!");
        }
        onClose();
        setText('');
        setImagePreview(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#111b21] border-[#222d34] text-[#e9edef] max-w-md p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b border-[#222d34]">
                    <DialogTitle>Create Status</DialogTitle>
                    <DialogDescription className="sr-only">Create and customize your status update.</DialogDescription>
                </DialogHeader>

                <div className="h-[400px] relative flex flex-col items-center justify-center transition-colors duration-300" style={{ backgroundColor: activeTab === 'text' ? bgColor : '#000' }}>
                    {activeTab === 'text' ? (
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type a status..."
                            className="bg-transparent border-none text-center text-xl md:text-2xl text-white placeholder:text-white/50 focus-visible:ring-0 resize-none h-full pt-32"
                            maxLength={200}
                        />
                    ) : (
                        <div className="w-full h-full relative">
                            {imagePreview ? (
                                <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-[#8696a0]">
                                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                                    <p>Select an image</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                onChange={handleImageUpload}
                            />
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div className="absolute bottom-4 left-0 w-full flex justify-center gap-2 px-4">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    className={`w-6 h-6 rounded-full border-2 ${bgColor === c ? 'border-white' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setBgColor(c)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-[#1f2c34] flex justify-between items-center">
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`rounded-full ${activeTab === 'text' ? 'bg-[#2a3942] text-[#00a884]' : 'text-[#8696a0]'}`}
                            onClick={() => setActiveTab('text')}
                        >
                            <Type className="w-5 h-5" />
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8 z-20"
                                onChange={handleImageUpload}
                                title="Upload Image"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`rounded-full ${activeTab === 'image' ? 'bg-[#2a3942] text-[#00a884]' : 'text-[#8696a0]'}`}
                            >
                                <ImageIcon className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        className="bg-[#00a884] hover:bg-[#008f72] rounded-full w-10 h-10 p-0 flex items-center justify-center text-[#111b21]"
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
