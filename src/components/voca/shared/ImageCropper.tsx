import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import {
    RotateCcw, RotateCw, ZoomIn, ZoomOut, Check, X, Upload,
    Image as ImageIcon, Crop, Maximize, Square, RectangleHorizontal
} from 'lucide-react';
import { cn } from '../../ui/utils';

// Point type for react-easy-crop
type Point = { x: number; y: number };

interface ImageCropperProps {
    isOpen: boolean;
    onClose: () => void;
    onCropComplete: (croppedImageUrl: string) => void;
    aspectRatio?: number;
    title?: string;
}

// Helper function to create cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number } | null,
    rotation = 0
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    const rotRad = (rotation * Math.PI) / 180;

    // Calculate bounding box of the rotated image
    const bBoxWidth = Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
    const bBoxHeight = Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

    // Set canvas size
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate to center and rotate
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Draw the image
    ctx.drawImage(image, 0, 0);

    // If no crop, return the rotated full image
    if (!pixelCrop) {
        return canvas.toDataURL('image/jpeg', 0.92);
    }

    // Create a new canvas for the cropped area
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');

    if (!croppedCtx) {
        throw new Error('No 2d context');
    }

    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    croppedCtx.drawImage(
        canvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return croppedCanvas.toDataURL('image/jpeg', 0.92);
}

type CropMode = 'free' | '1:1' | '16:9' | '4:3';

/**
 * A reusable Image Cropper component with Rotate, Zoom, and Aspect Ratio controls.
 * Uses CSS variables for theming to match the rest of the app.
 */
export const ImageCropper = ({
    isOpen,
    onClose,
    onCropComplete,
    title = 'Edit Image'
}: ImageCropperProps) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isCropping, setIsCropping] = useState(false);
    const [cropMode, setCropMode] = useState<CropMode>('free');
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getCropAspect = () => {
        switch (cropMode) {
            case '1:1': return 1;
            case '16:9': return 16 / 9;
            case '4:3': return 4 / 3;
            default: return undefined; // Free crop
        }
    };

    const onCropChange = useCallback((location: Point) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onCropCompleteCallback = useCallback(
        (_: unknown, croppedPixels: { x: number; y: number; width: number; height: number }) => {
            setCroppedAreaPixels(croppedPixels);
        },
        []
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
                // Reset states
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setRotation(0);
                setIsCropping(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRotateLeft = () => {
        setRotation((prev) => (prev - 90 + 360) % 360);
    };

    const handleRotateRight = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const handleConfirm = async () => {
        if (!imageSrc) return;

        try {
            const result = await getCroppedImg(
                imageSrc,
                isCropping ? croppedAreaPixels : null,
                rotation
            );
            onCropComplete(result);
            handleClose();
        } catch (error) {
            console.error('Error processing image:', error);
        }
    };

    const handleClose = () => {
        setImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setIsCropping(false);
        setCroppedAreaPixels(null);
        onClose();
    };

    const toggleCropMode = () => {
        setIsCropping(!isCropping);
        if (!isCropping) {
            setZoom(1);
            setCrop({ x: 0, y: 0 });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            {/* Using app theme variables for background and border */}
            <DialogContent className="bg-[var(--wa-panel-bg)] border-[var(--wa-border)] text-[var(--wa-text-primary)] max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0">
                <DialogHeader className="p-4 border-b border-[var(--wa-border)] bg-[var(--wa-header-bg)]">
                    <DialogTitle className="text-[var(--wa-text-primary)] flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-[var(--wa-primary)]" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-[var(--wa-text-secondary)]">
                        {imageSrc ? 'Adjust your image before uploading' : 'Select an image to upload'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative">
                    {!imageSrc ? (
                        // Upload area
                        <div className="p-8 bg-[var(--wa-app-bg)] h-[400px] flex items-center justify-center">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-[var(--wa-border)] rounded-2xl p-10 w-full h-full flex flex-col items-center justify-center cursor-pointer hover:border-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/5 transition-all duration-300 group"
                            >
                                <div className="w-20 h-20 rounded-full bg-[var(--wa-primary)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Upload className="w-10 h-10 text-[var(--wa-primary)]" />
                                </div>
                                <p className="text-[var(--wa-text-primary)] text-lg font-medium mb-2">Upload Image</p>
                                <p className="text-[var(--wa-text-secondary)] text-sm text-center">
                                    Tap to select a photo from your device
                                </p>
                                <p className="text-[var(--wa-text-secondary)] opacity-60 text-xs mt-4">
                                    Supports JPG, PNG, GIF, WebP
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        // Image preview/edit area
                        <div className="flex flex-col h-[500px]">
                            {/* Image Container */}
                            <div className="flex-1 relative bg-black overflow-hidden">
                                {isCropping ? (
                                    // Crop mode
                                    <Cropper
                                        image={imageSrc}
                                        crop={crop}
                                        zoom={zoom}
                                        rotation={rotation}
                                        aspect={getCropAspect()}
                                        onCropChange={onCropChange}
                                        onZoomChange={onZoomChange}
                                        onCropComplete={onCropCompleteCallback}
                                        showGrid={true}
                                        cropShape="round" // Recommend round crop for profile pics, can change to 'rect' with props if needed
                                        objectFit="contain"
                                    />
                                ) : (
                                    // Preview mode - show full image
                                    <div className="absolute inset-0 flex items-center justify-center p-4">
                                        <img
                                            src={imageSrc}
                                            alt="Preview"
                                            className="max-w-full max-h-full object-contain transition-transform duration-200"
                                            style={{ transform: `rotate(${rotation}deg)` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bottom Controls */}
                            <div className="bg-[var(--wa-header-bg)] p-4 space-y-4 border-t border-[var(--wa-border)]">
                                {/* Action Bar */}
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleCropMode}
                                        className={cn(
                                            "gap-2 transition-colors",
                                            isCropping
                                                ? "text-[var(--wa-primary)] bg-[var(--wa-primary)]/10 hover:bg-[var(--wa-primary)]/20"
                                                : "text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)]"
                                        )}
                                    >
                                        <Crop className="w-4 h-4" />
                                        {isCropping ? 'Exit Crop' : 'Crop'}
                                    </Button>

                                    {/* Rotate Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleRotateLeft}
                                            className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-[var(--wa-hover)] h-8 w-8"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleRotateRight}
                                            className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-[var(--wa-hover)] h-8 w-8"
                                        >
                                            <RotateCw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Crop Aspect Ratio Options - Only when cropping */}
                                {isCropping && (
                                    <div className="flex gap-1 justify-center py-1">
                                        {/* Aspect Ratio Buttons */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCropMode('free')}
                                            className={cn("h-8 px-3 text-xs gap-1", cropMode === 'free' ? "text-[var(--wa-primary)] bg-[var(--wa-primary)]/10" : "text-[var(--wa-text-secondary)]")}
                                        >
                                            <Maximize className="w-3 h-3" /> Free
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCropMode('1:1')}
                                            className={cn("h-8 px-3 text-xs gap-1", cropMode === '1:1' ? "text-[var(--wa-primary)] bg-[var(--wa-primary)]/10" : "text-[var(--wa-text-secondary)]")}
                                        >
                                            <Square className="w-3 h-3" /> 1:1
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCropMode('16:9')}
                                            className={cn("h-8 px-3 text-xs gap-1", cropMode === '16:9' ? "text-[var(--wa-primary)] bg-[var(--wa-primary)]/10" : "text-[var(--wa-text-secondary)]")}
                                        >
                                            <RectangleHorizontal className="w-3 h-3" /> 16:9
                                        </Button>
                                    </div>
                                )}

                                {/* Zoom Slider - Only when cropping */}
                                {isCropping && (
                                    <div className="flex items-center gap-4 px-2">
                                        <ZoomOut className="w-4 h-4 text-[var(--wa-text-secondary)]" />
                                        <Slider
                                            value={[zoom]}
                                            min={1}
                                            max={3}
                                            step={0.05}
                                            onValueChange={(value: number[]) => setZoom(value[0])}
                                            className="flex-1"
                                        />
                                        <ZoomIn className="w-4 h-4 text-[var(--wa-text-secondary)]" />
                                    </div>
                                )}

                                {/* Change Image Button */}
                                <Button
                                    variant="ghost"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] border border-[var(--wa-border)] hover:border-[var(--wa-primary)]"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Change Image
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t border-[var(--wa-border)] flex gap-3 bg-[var(--wa-app-bg)]">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] hover:bg-[var(--wa-hover)]"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!imageSrc}
                        className="bg-[var(--wa-primary)] hover:bg-[var(--wa-primary)]/90 text-white font-medium"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
