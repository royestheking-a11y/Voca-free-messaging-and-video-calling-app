import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { Point, Area } from 'react-easy-crop';
import { Button } from '../../ui/button';
import { Camera, X, FlipHorizontal, Image as ImageIcon, Check, Zap, ZapOff, Crop, Sticker, Type, Pencil, Send } from 'lucide-react';
import { cn } from '../../ui/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface CameraComponentProps {
    onCapture: (imageData: string, caption?: string) => void;
    onClose: () => void;
    mode: 'message' | 'status';
}

export const CameraComponent = ({ onCapture, onClose, mode }: CameraComponentProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [caption, setCaption] = useState('');
    const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editing State
    const [editMode, setEditMode] = useState<'none' | 'crop' | 'paint' | 'text' | 'sticker'>('none');
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [stickers, setStickers] = useState<{ id: string, content: string, x: number, y: number }[]>([]);
    const [textOverlays, setTextOverlays] = useState<{ id: string, text: string, x: number, y: number, color: string }[]>([]);
    const [drawPaths, setDrawPaths] = useState<{ x: number, y: number, color: string }[][]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState('#ff0000');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCapturedImage(reader.result as string);
                stopCamera();
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [facingMode]);

    const startCamera = async () => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error) {
            console.error('Camera access error:', error);
            toast.error('Failed to access camera. Please grant camera permissions.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Determine mirroring based on facing mode
                if (facingMode === 'user') {
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                }

                ctx.drawImage(video, 0, 0);

                // Reset transform
                if (facingMode === 'user') {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                }

                const imageData = canvas.toDataURL('image/jpeg', 0.95);
                setCapturedImage(imageData);
                stopCamera();
            }
        }
    };

    const retake = () => {
        setCapturedImage(null);
        setCaption('');
        setStickers([]);
        setTextOverlays([]);
        setDrawPaths([]);
        setEditMode('none');
        startCamera();
    };

    const compositeImage = async () => {
        if (!capturedImage) return null;

        const image = new Image();
        image.src = capturedImage;
        await new Promise((resolve) => { image.onload = resolve; });

        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Draw base image
        ctx.drawImage(image, 0, 0);

        // Draw Stickers
        // Note: In UI they are centered at 50%, 50%. We'll stick to that simple logic for now.
        // If we implemented dragging, we'd use stickers[i].x/y percentages.
        ctx.font = `${canvas.width * 0.15}px serif`; // Scale emoji size relative to width
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        stickers.forEach(sticker => {
            // sticker.x and y are expected to be percentage 0-100 or screen coords. 
            // In our UI code they are init at 50,50. Let's assume percentage 0-100.
            const x = (sticker.x / 100) * canvas.width;
            const y = (sticker.y / 100) * canvas.height;
            ctx.fillText(sticker.content, x, y);
        });

        // Draw Text Overlays
        ctx.font = `bold ${canvas.width * 0.08}px sans-serif`;
        textOverlays.forEach(text => {
            const x = (text.x / 100) * canvas.width;
            const y = (text.y / 100) * canvas.height;
            ctx.fillStyle = text.color;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = canvas.width * 0.005;
            ctx.strokeText(text.text, x, y);
            ctx.fillText(text.text, x, y);
        });

        return canvas.toDataURL('image/jpeg', 0.9);
    };

    const confirm = async () => {
        if (capturedImage) {
            let finalImage = capturedImage;

            // If we have edits, composite them
            if (stickers.length > 0 || textOverlays.length > 0) {
                const composited = await compositeImage();
                if (composited) {
                    finalImage = composited;
                }
            }

            if (mode === 'status' && !caption.trim()) {
                // Optional: require caption for status? WhatsApp allows empty caption.
                // Keeping it flexible.
            }
            onCapture(finalImage, caption);
            handleClose();
        }
    };

    const handleClose = () => {
        stopCamera();
        onClose();
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const toggleFlash = () => {
        setFlashMode(prev => prev === 'off' ? 'on' : 'off');
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black flex flex-col"
            style={{
                zIndex: 99999,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100dvh'
            }}
        >
            {!capturedImage ? (
                // --- CAMERA VIEW ---
                <>
                    {/* Top Controls Overlay */}
                    <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-start pt-8 pb-4 px-4 bg-gradient-to-b from-black/60 to-transparent h-28">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            className="text-white hover:bg-white/10 rounded-full w-10 h-10"
                        >
                            <X className="w-6 h-6" />
                        </Button>

                        <div className="flex gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleFlash}
                                className="text-white hover:bg-white/10 rounded-full w-10 h-10"
                            >
                                {flashMode === 'on' ? <Zap className="w-6 h-6 fill-white" /> : <ZapOff className="w-6 h-6" />}
                            </Button>
                        </div>
                    </div>

                    {/* Camera Feed */}
                    <div className="flex-1 relative bg-black overflow-hidden flex flex-col justify-center">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            style={{
                                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                                objectFit: 'cover'
                            }}
                            className="w-full h-full"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    {/* Bottom Controls Area */}
                    <div className="relative bg-black/90 pt-4 pb-10 px-6">
                        {/* Scrollable mode selector placeholder (Photo/Video) - Visual only */}
                        <div className="flex justify-center gap-6 mb-6 text-sm font-medium uppercase tracking-wider">
                            <span className="text-white/40">Video</span>
                            <span className="text-white bg-white/20 px-3 py-1 rounded-full">Photo</span>
                        </div>

                        <div className="flex items-center justify-between px-4 pb-4">
                            {/* Gallery Thumbnail Placeholder - Replaced with functional upload */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-12 h-12 rounded-lg bg-[#333] border border-white/20 flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
                            >
                                <ImageIcon className="w-6 h-6 text-white/50" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />

                            {/* Shutter Button - Replaced motion.button with standard button for reliability */}
                            <button
                                onClick={capturePhoto}
                                className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center relative group active:scale-90 transition-transform"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <Camera className="w-9 h-9 text-black" strokeWidth={2.5} />
                                </div>
                            </button>

                            {/* Switch Camera */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={switchCamera}
                                className="w-12 h-12 rounded-full bg-[#333]/50 text-white hover:bg-[#333]"
                            >
                                <FlipHorizontal className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                // --- REVIEW / EDIT MODE ---
                <>
                    {/* Top Edit Controls */}
                    <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-start pt-8 pb-4 px-4 bg-gradient-to-b from-black/50 to-transparent">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={editMode === 'none' ? retake : () => setEditMode('none')}
                            className="text-white hover:bg-white/10 rounded-full w-10 h-10"
                        >
                            <X className="w-6 h-6" />
                        </Button>

                        {editMode === 'none' && (
                            <div className="flex gap-4">
                                <Button variant="ghost" size="icon" onClick={() => setEditMode('crop')} className="text-white hover:bg-white/10 rounded-full">
                                    <Crop className="w-5 h-5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setEditMode('sticker')} className="text-white hover:bg-white/10 rounded-full">
                                    <Sticker className="w-5 h-5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setEditMode('text')} className="text-white hover:bg-white/10 rounded-full">
                                    <Type className="w-5 h-5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setEditMode('paint')} className="text-white hover:bg-white/10 rounded-full">
                                    <Pencil className="w-5 h-5" />
                                </Button>
                            </div>
                        )}

                        {editMode !== 'none' && (
                            <Button
                                variant="ghost"
                                onClick={async () => {
                                    if (editMode === 'crop' && croppedAreaPixels) {
                                        try {
                                            const croppedImage = await getCroppedImg(capturedImage!, croppedAreaPixels);
                                            setCapturedImage(croppedImage);
                                            // Reset cropping state
                                            setCrop({ x: 0, y: 0 });
                                            setZoom(1);
                                        } catch (e) {
                                            console.error(e);
                                            toast.error('Failed to crop image');
                                        }
                                    }
                                    setEditMode('none');
                                }}
                                className="text-white font-medium hover:bg-white/10"
                            >
                                Done
                            </Button>
                        )}
                    </div>

                    {/* Editor Content Area */}
                    <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden" style={{ height: 'calc(100% - 140px)' }}>
                        {editMode === 'crop' ? (
                            <div className="relative w-full h-full bg-black">
                                <Cropper
                                    image={capturedImage!}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={undefined}
                                    onCropChange={setCrop}
                                    onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                                    onZoomChange={setZoom}
                                />
                            </div>
                        ) : (
                            <div className="relative max-w-full max-h-full h-full flex items-center justify-center">
                                <img
                                    src={capturedImage!}
                                    alt="Captured"
                                    className="max-w-full max-h-full object-contain touch-none"
                                />

                                {/* Overlays (Text/Stickers) */}
                                {stickers.map(s => (
                                    <div key={s.id} className="absolute text-4xl select-none" style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%)` }}>
                                        {s.content}
                                    </div>
                                ))}
                                {textOverlays.map(t => (
                                    <div key={t.id} className="absolute text-2xl font-bold text-white select-none drop-shadow-md" style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%)`, color: t.color }}>
                                        {t.text}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sticker Picker */}
                        {editMode === 'sticker' && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 overflow-x-auto whitespace-nowrap z-30">
                                {['😀', '😂', '😍', '😎', '🎉', '🔥', '❤️', '👍', '👀', '💯', '🤔', '👋'].map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            setStickers([...stickers, { id: Date.now().toString(), content: emoji, x: 50, y: 50 }]);
                                        }}
                                        className="text-3xl mx-2 hover:scale-125 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Text Input Overlay */}
                        {editMode === 'text' && (
                            <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center">
                                <input
                                    autoFocus
                                    className="bg-transparent text-white text-3xl font-bold border-none outline-none text-center w-full"
                                    placeholder="Type something..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = e.currentTarget.value;
                                            if (val.trim()) {
                                                setTextOverlays([...textOverlays, { id: Date.now().toString(), text: val, x: 50, y: 50, color: '#ffffff' }]);
                                                setEditMode('none');
                                            }
                                        }
                                    }}
                                />
                                <div className="absolute top-4 right-4 text-white/50 text-sm">Press Enter to add</div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Caption & Send Bar - Only show when NOT editing */}
                    {editMode === 'none' && (
                        <div className="bg-black p-3 pb-8">
                            <div className="flex items-end gap-3 px-2 pb-4">
                                <div className="flex-1 bg-[#1f2c34] rounded-3xl flex items-center px-4 py-2 min-h-[48px]">
                                    <ImageIcon className="w-5 h-5 text-gray-400 mr-3" />
                                    <input
                                        type="text"
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        placeholder="Add a caption..."
                                        className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-[15px]"
                                        autoFocus
                                    />
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={confirm}
                                    className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg hover:bg-[#008f72] transition-colors"
                                >
                                    <Send className="w-5 h-5 text-white fill-white ml-0.5" />
                                </motion.button>
                            </div>

                            {mode === 'status' && (
                                <div className="px-4 pb-4 text-xs text-gray-400 text-center">
                                    Status will be visible to your contacts
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>,
        document.body
    );
};

// Utility to create cropped image
const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Canvas is empty');
                return;
            }
            resolve(URL.createObjectURL(blob));
        }, 'image/jpeg');
    });
};
