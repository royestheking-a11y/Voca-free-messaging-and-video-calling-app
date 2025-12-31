import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StatusUpdate } from '../../../lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { X, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { Progress } from '../../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { useVoca } from '../VocaContext';
import { toast } from 'sonner';

interface StatusViewerProps {
    statuses: StatusUpdate[];
    initialIndex?: number;
    onClose: () => void;
}

export const StatusViewer = ({ statuses, initialIndex = 0, onClose }: StatusViewerProps) => {
    const { currentUser, deleteStatus } = useVoca();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [showViewers, setShowViewers] = useState(false);

    const currentStatus = statuses[currentIndex];
    const isOwnStatus = currentStatus?.userId === currentUser?.id || currentStatus?.user?.id === currentUser?.id;
    const viewCount = currentStatus?.viewers?.length || 0;

    useEffect(() => {
        setProgress(0);
        const duration = 5000; // 5 seconds per status
        const interval = 50; // Update every 50ms
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            setProgress((currentStep / steps) * 100);

            if (currentStep >= steps) {
                if (currentIndex < statuses.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                } else {
                    onClose();
                }
            }
        }, interval);

        return () => clearInterval(timer);
    }, [currentIndex, statuses.length, onClose]);

    // Auto-track view when status opens (only if not own status)
    useEffect(() => {
        if (currentStatus && !isOwnStatus && currentStatus.id) {
            const trackView = async () => {
                try {
                    const { statusesAPI } = await import('../../../lib/api');
                    await statusesAPI.view(currentStatus.id);
                } catch (error) {
                    console.error('Failed to track view:', error);
                }
            };
            trackView();
        }
    }, [currentStatus?.id, isOwnStatus]);

    const handleNext = () => {
        if (currentIndex < statuses.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleDelete = async () => {
        if (!currentStatus?.id) return;

        try {
            await deleteStatus(currentStatus.id);
            toast.success('Status deleted');
            onClose();
        } catch (error) {
            toast.error('Failed to delete status');
        }
    };

    if (!currentStatus) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
            {/* Progress Bars */}
            <div className="absolute top-4 left-0 w-full px-4 flex gap-1 z-20">
                {statuses.map((_, idx) => (
                    <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-linear"
                            style={{
                                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-0 w-full px-4 flex justify-between items-center z-20 pt-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full -ml-2">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Avatar className="h-10 w-10 border border-white/20">
                        <AvatarImage src={currentStatus.user?.avatar || (currentStatus.userId as any)?.avatar} />
                        <AvatarFallback>
                            {(currentStatus.user?.name || (currentStatus.userId as any)?.name || '?').charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-white">
                        <span className="font-medium text-sm shadow-black/50 drop-shadow-md">
                            {currentStatus.user?.name || (currentStatus.userId as any)?.name || 'Unknown'}
                        </span>
                        <span className="text-xs opacity-80 shadow-black/50 drop-shadow-md">
                            {new Date(currentStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isOwnStatus && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowViewers(true)}
                                className="text-white hover:bg-white/10 rounded-full relative"
                            >
                                <Eye className="w-5 h-5" />
                                {viewCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                        {viewCount}
                                    </span>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDelete}
                                className="text-white hover:bg-red-500/20 rounded-full"
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full">
                        <X className="w-6 h-6" />
                    </Button>
                </div>
            </div>

            {/* Viewers Modal */}
            {isOwnStatus && (
                <Dialog open={showViewers} onOpenChange={setShowViewers}>
                    <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Viewed by {viewCount}</DialogTitle>
                            <DialogDescription className="sr-only">List of people who viewed this status</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {currentStatus.viewers && currentStatus.viewers.length > 0 ? (
                                <div className="space-y-2">
                                    {currentStatus.viewers.map((viewer: any) => {
                                        if (!viewer) return null;
                                        return (
                                            <div key={viewer.id || viewer._id} className="flex items-center gap-3 p-2 hover:bg-[var(--wa-hover)] rounded-lg">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={viewer.avatar} />
                                                    <AvatarFallback>{viewer.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{viewer.name}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-[var(--wa-text-secondary)] py-8">No views yet</p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Navigation Areas */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={handleNext} />

            {/* Content */}
            <div className="w-full h-full flex items-center justify-center relative bg-black">
                {currentStatus.type === 'text' || currentStatus.mediaType === 'text' ? (
                    <div
                        className="w-full h-full flex items-center justify-center text-center p-8"
                        style={{ backgroundColor: currentStatus.caption || currentStatus.color || '#005c4b' }}
                    >
                        <p className="text-white text-2xl md:text-4xl font-medium leading-relaxed max-w-2xl">
                            {currentStatus.mediaUrl || currentStatus.content}
                        </p>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        <img
                            src={currentStatus.mediaUrl || (currentStatus.content?.startsWith('http') ? currentStatus.content : "https://images.unsplash.com/photo-1595111956041-948967406a38?w=800&q=80")}
                            className="max-w-full max-h-full object-contain"
                            alt="Status"
                        />

                        {(currentStatus.caption || (currentStatus.content && !currentStatus.content.startsWith('http') && currentStatus.content !== 'Shared an image')) && (
                            <p className="absolute bottom-20 bg-black/50 text-white px-4 py-2 rounded-lg text-lg backdrop-blur-sm">
                                {currentStatus.caption || currentStatus.content}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
        , document.body);
};
