import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
    isLoading: boolean;
    onComplete?: () => void;
}

export const SplashScreen = ({ isLoading, onComplete }: SplashScreenProps) => {
    const [showFullName, setShowFullName] = useState(false);
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        // Show "V" first, then reveal full name after 500ms
        const timer = setTimeout(() => {
            setShowFullName(true);
        }, 600);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // When loading is done and animation has played, hide splash
        if (!isLoading && showFullName) {
            const hideTimer = setTimeout(() => {
                setShouldHide(true);
                onComplete?.();
            }, 800);
            return () => clearTimeout(hideTimer);
        }
    }, [isLoading, showFullName, onComplete]);

    if (shouldHide) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
            >
                {/* Subtle gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-[#e8f5f4] pointer-events-none" />

                {/* Logo Container */}
                <div className="relative z-10 flex flex-col items-center">
                    {/* Animated Logo */}
                    <div className="flex items-center justify-center">
                        {/* V Logo with gradient */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                duration: 0.6
                            }}
                            className="relative"
                        >
                            <div className="w-20 h-20 bg-gradient-to-br from-[#006D77] to-[#83C5BE] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#006D77]/30">
                                <span className="text-white font-bold text-4xl tracking-tight">V</span>
                            </div>

                            {/* Glow effect */}
                            <div className="absolute inset-0 w-20 h-20 bg-[#006D77] rounded-2xl blur-xl opacity-30 -z-10" />
                        </motion.div>

                        {/* "oca" text slides in */}
                        <AnimatePresence>
                            {showFullName && (
                                <motion.span
                                    initial={{ opacity: 0, x: -20, width: 0 }}
                                    animate={{ opacity: 1, x: 0, width: 'auto' }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 150,
                                        damping: 20,
                                        delay: 0.1
                                    }}
                                    className="text-5xl font-bold text-[#006D77] ml-3 overflow-hidden"
                                >
                                    oca
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Tagline */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: showFullName ? 1 : 0, y: showFullName ? 0 : 10 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="text-gray-400 text-sm mt-6 tracking-widest uppercase"
                    >
                        Connect Freely
                    </motion.p>

                    {/* Loading indicator - subtle dots */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="flex gap-1.5 mt-8"
                        >
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.3, 1, 0.3]
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.15
                                    }}
                                    className="w-2 h-2 rounded-full bg-[#006D77]"
                                />
                            ))}
                        </motion.div>
                    )}
                </div>

                {/* Bottom branding */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showFullName ? 0.5 : 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute bottom-8 text-gray-300 text-xs tracking-wider"
                >
                    from <span className="text-[#006D77] font-medium">Voca Team</span>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SplashScreen;
