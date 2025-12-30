import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
    isLoading: boolean;
    onComplete?: () => void;
}

export const SplashScreen = ({ isLoading, onComplete }: SplashScreenProps) => {
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        // When loading is done, hide splash after a brief moment
        if (!isLoading) {
            const hideTimer = setTimeout(() => {
                setShouldHide(true);
                onComplete?.();
            }, 500);
            return () => clearTimeout(hideTimer);
        }
    }, [isLoading, onComplete]);

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
                        <div className="w-24 h-24 bg-gradient-to-br from-[#006D77] to-[#83C5BE] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#006D77]/30">
                            <span className="text-white font-bold text-5xl tracking-tight">V</span>
                        </div>

                        {/* Glow effect */}
                        <div className="absolute inset-0 w-24 h-24 bg-[#006D77] rounded-3xl blur-xl opacity-30 -z-10" />
                    </motion.div>

                    {/* Loading indicator - subtle dots */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="flex gap-1.5 mt-10"
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
                                    className="w-2.5 h-2.5 rounded-full bg-[#006D77]"
                                />
                            ))}
                        </motion.div>
                    )}
                </div>

                {/* Bottom branding with version */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-8 flex flex-col items-center gap-1"
                >
                    <span className="text-gray-400 text-xs tracking-wider">
                        from <span className="text-[#006D77] font-medium">Voca Team</span>
                    </span>
                    <span className="text-gray-300 text-[10px] tracking-widest">
                        Version 3.0
                    </span>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SplashScreen;

