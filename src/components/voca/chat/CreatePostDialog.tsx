import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Image, X, Loader2 } from 'lucide-react';
import { useVoca } from '../VocaContext';
import { toast } from 'sonner';

interface CreatePostDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreatePostDialog = ({ isOpen, onClose }: CreatePostDialogProps) => {
    const { currentUser, createPost } = useVoca();
    const [content, setContent] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            toast.loading('Uploading image...', { id: 'post-image' });
            try {
                const { uploadAPI } = await import('../../../lib/api');
                const result = await uploadAPI.image(file);
                setImagePreview(result.url);
                toast.success('Image uploaded', { id: 'post-image' });
            } catch (error: any) {
                console.error('Upload error:', error);
                toast.error(`Upload failed: ${error.message}`, { id: 'post-image' });
            }
        }
    };

    const handlePost = async () => {
        if (!content.trim() && !imagePreview) {
            toast.error('Please add some content or an image');
            return;
        }

        setIsPosting(true);

        // Simulate posting delay
        await new Promise(resolve => setTimeout(resolve, 500));

        createPost(content, imagePreview || undefined);
        toast.success('Post created!');

        // Reset and close
        setContent('');
        setImagePreview(null);
        setIsPosting(false);
        onClose();
    };

    const handleClose = () => {
        setContent('');
        setImagePreview(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-lg p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b border-[var(--wa-border)]">
                    <DialogTitle className="text-lg font-medium">Create Post</DialogTitle>
                    <DialogDescription className="sr-only">Create a new post to share with your contacts</DialogDescription>
                </DialogHeader>

                <div className="p-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={currentUser?.avatar} />
                            <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-[var(--wa-text-primary)]">{currentUser?.name}</p>
                            <p className="text-xs text-[var(--wa-text-secondary)]">Public post</p>
                        </div>
                    </div>

                    {/* Content Input */}
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full bg-transparent text-[var(--wa-text-primary)] placeholder:text-[var(--wa-text-secondary)] resize-none focus:outline-none min-h-[120px] text-lg"
                        autoFocus
                    />

                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="relative mt-3 rounded-xl overflow-hidden">
                            <img src={imagePreview} alt="Preview" className="w-full max-h-[300px] object-cover" />
                            <button
                                onClick={() => setImagePreview(null)}
                                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition-colors"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-[var(--wa-border)] flex items-center justify-between">
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageSelect}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/10"
                        >
                            <Image className="w-5 h-5 mr-2" />
                            Photo
                        </Button>
                    </div>

                    <Button
                        onClick={handlePost}
                        disabled={isPosting || (!content.trim() && !imagePreview)}
                        className="bg-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/90 text-[#0b141a] font-medium px-6"
                    >
                        {isPosting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Posting...
                            </>
                        ) : (
                            'Post'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
