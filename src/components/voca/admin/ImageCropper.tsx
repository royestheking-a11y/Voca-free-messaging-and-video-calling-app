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

export const ImageCropper = ({
    isOpen,
    onClose,
    onCropComplete,
    title = 'Edit Image'
}: ImageCropperProps) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
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

    const onCropChange = useCallback((location: { x: number; y: number }) => {
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
            <DialogContent className="bg-[#1f2c34] border-[#2a3942] text-white max-w-2xl max-h-[90vh] overflow-hidden p-0">
                <DialogHeader className="p-4 border-b border-[#2a3942]">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-[#83C5BE]" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        {imageSrc ? 'Adjust your image before uploading' : 'Select an image to upload'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    {!imageSrc ? (
                        // Upload area - WhatsApp style
                        <div className="p-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-[#2a3942] rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer hover:border-[#00a884] hover:bg-[#00a884]/5 transition-all duration-300 group"
                            >
                                <div className="w-20 h-20 rounded-full bg-[#00a884]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Upload className="w-10 h-10 text-[#00a884]" />
                                </div>
                                <p className="text-white text-lg font-medium mb-2">Upload Image</p>
                                <p className="text-gray-500 text-sm text-center">
                                    Tap to select a photo from your device
                                </p>
                                <p className="text-gray-600 text-xs mt-4">
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
                        // Image preview/edit area - WhatsApp style
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
                                        cropShape="rect"
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

                            {/* Bottom Controls - WhatsApp style */}
                            <div className="bg-[#0b141a] p-4 space-y-4">
                                {/* Crop Mode Toggle */}
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleCropMode}
                                        className={cn(
                                            "gap-2 transition-colors",
                                            isCropping
                                                ? "text-[#00a884] bg-[#00a884]/10"
                                                : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        <Crop className="w-4 h-4" />
                                        {isCropping ? 'Exit Crop' : 'Crop'}
                                    </Button>

                                    {/* Aspect Ratio Options - Only when cropping */}
                                    {isCropping && (
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCropMode('free')}
                                                className={cn(
                                                    "h-8 px-3",
                                                    cropMode === 'free'
                                                        ? "text-[#00a884] bg-[#00a884]/10"
                                                        : "text-gray-400"
                                                )}
                                            >
                                                <Maximize className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCropMode('1:1')}
                                                className={cn(
                                                    "h-8 px-3",
                                                    cropMode === '1:1'
                                                        ? "text-[#00a884] bg-[#00a884]/10"
                                                        : "text-gray-400"
                                                )}
                                            >
                                                <Square className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCropMode('16:9')}
                                                className={cn(
                                                    "h-8 px-3",
                                                    cropMode === '16:9'
                                                        ? "text-[#00a884] bg-[#00a884]/10"
                                                        : "text-gray-400"
                                                )}
                                            >
                                                <RectangleHorizontal className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Rotate Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleRotateLeft}
                                            className="text-gray-400 hover:text-white h-8 w-8"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleRotateRight}
                                            className="text-gray-400 hover:text-white h-8 w-8"
                                        >
                                            <RotateCw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Zoom Slider - Only when cropping */}
                                {isCropping && (
                                    <div className="flex items-center gap-4">
                                        <ZoomOut className="w-4 h-4 text-gray-500" />
                                        <Slider
                                            value={[zoom]}
                                            min={1}
                                            max={3}
                                            step={0.05}
                                            onValueChange={(value: number[]) => setZoom(value[0])}
                                            className="flex-1"
                                        />
                                        <ZoomIn className="w-4 h-4 text-gray-500" />
                                    </div>
                                )}

                                {/* Change Image */}
                                <Button
                                    variant="ghost"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full text-gray-400 hover:text-white border border-[#2a3942] hover:border-[#00a884]"
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

                <DialogFooter className="p-4 border-t border-[#2a3942] flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!imageSrc}
                        className="bg-[#00a884] hover:bg-[#008f72] text-[#0b141a] font-medium"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
