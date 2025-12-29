import React from 'react';
import { Phone, Video } from 'lucide-react';
import { motion } from 'motion/react';
import { useVoca } from '../VocaContext';

/**
 * Floating call bar that shows when user navigates away from active call
 * Clicking it returns user to the call interface
 */
export const FloatingCallBar = () => {
    const { activeCall } = useVoca();

    if (!activeCall) return null;

    const handleClick = () => {
        // Click handler is in parent (ChatLayout) - this is just for display
        console.log('📞 Floating bar clicked - showing call UI');
    };

    const isVideo = activeCall.type === 'video';

    return (
        <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[90] bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg cursor-pointer"
            onClick={handleClick}
        >
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        {isVideo ? (
                            <Video className="w-5 h-5" />
                        ) : (
                            <Phone className="w-5 h-5" />
                        )}
                    </div>
                    <div>
                        <p className="font-semibold text-sm">
                            {isVideo ? 'Video call' : 'Voice call'} in progress
                        </p>
                        <p className="text-xs text-white/80">
                            Tap to return to call
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-white"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                        className="w-2 h-2 rounded-full bg-white"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                        className="w-2 h-2 rounded-full bg-white"
                    />
                </div>
            </div>
        </motion.div>
    );
};
