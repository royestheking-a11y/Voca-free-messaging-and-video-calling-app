import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../ui/button';
import { ArrowLeft, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useState } from 'react';

interface ImageViewerProps {
    imageUrl: string;
    onClose: () => void;
}

export const ImageViewer = ({ imageUrl, onClose }: ImageViewerProps) => {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Prevent body scroll when viewer is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `voca-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const rotate = () => setRotation(prev => (prev + 90) % 360);

    const content = (
        <div
            className="fixed inset-0 bg-black flex flex-col"
            style={{ zIndex: 99999 }}
        >
            {/* Header */}
            <div className="h-14 bg-[#1f2c33] flex items-center justify-between px-4 shrink-0 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-white hover:bg-white/10 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <span className="text-white text-base font-medium">Image Preview</span>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={zoomOut}
                        className="text-white hover:bg-white/10 rounded-full h-9 w-9"
                        disabled={zoom <= 0.5}
                    >
                        <ZoomOut className="w-5 h-5" />
                    </Button>
                    <span className="text-white/70 text-sm min-w-[45px] text-center">{Math.round(zoom * 100)}%</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={zoomIn}
                        className="text-white hover:bg-white/10 rounded-full h-9 w-9"
                        disabled={zoom >= 3}
                    >
                        <ZoomIn className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={rotate}
                        className="text-white hover:bg-white/10 rounded-full h-9 w-9"
                    >
                        <RotateCw className="w-5 h-5" />
                    </Button>
                    <div className="w-px h-5 bg-white/20 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDownload}
                        className="text-white hover:bg-white/10 rounded-full h-9 w-9"
                    >
                        <Download className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-black">
                <img
                    src={imageUrl}
                    alt="Full view"
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                    style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                    draggable={false}
                />
            </div>

            {/* Footer */}
            <div className="h-16 bg-[#1f2c33] flex items-center justify-center px-4 shrink-0 border-t border-white/10">
                <Button
                    onClick={handleDownload}
                    className="bg-[var(--wa-primary)] text-black hover:bg-[var(--wa-primary)]/90 px-6 font-medium"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download Image
                </Button>
            </div>
        </div>
    );

    // Use portal to render at root level
    if (!mounted) return null;

    return createPortal(content, document.body);
};
