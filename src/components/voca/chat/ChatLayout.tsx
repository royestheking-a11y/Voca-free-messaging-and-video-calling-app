import React, { useState, useEffect } from 'react';
import { Outlet, useMatch, useNavigate } from 'react-router-dom';
import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import { useVoca } from '../VocaContext';
import { CallInterface } from './CallInterface';
import { FloatingCallBar } from './FloatingCallBar';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';

export const ChatLayout = () => {
    const { activeChatId, setActiveChatId, activeCall, endCall } = useVoca();
    const [isMobile, setIsMobile] = useState(false);
    const [isCallMinimized, setIsCallMinimized] = useState(false);
    const navigate = useNavigate();

    // Check routes to determine mobile view state
    const chatMatch = useMatch('/chat/:id');

    // Define tab routes that should show the sidebar on mobile, not the content area
    const tabRoutes = ['status', 'calls', 'groups', 'posts'];

    // Check if the current route is a real chat (not a tab)
    // useMatch('/chat/:id') matches 'status', 'calls' etc too, so we must filter them out
    const isTabRoute = chatMatch && tabRoutes.includes(chatMatch.params.id || '');
    const isChatOpen = !!chatMatch && !isTabRoute;

    // On mobile, show content ONLY if a specific chat is open. 
    // For tabs (status, calls, etc), we want to show the SIDEBAR (which contains the lists).
    const showContent = isMobile && isChatOpen;
    const showSidebar = !isMobile || !showContent;

    // Responsive check
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="flex h-screen bg-[var(--wa-app-bg)] overflow-hidden relative transition-colors duration-300">
            {/* Desktop Background band */}
            <div className="hidden xl:block absolute top-0 w-full h-32 bg-[#00a884] -z-10" />

            <div className="flex w-full h-full xl:max-w-[1700px] xl:mx-auto xl:my-5 xl:h-[calc(100vh-40px)] shadow-2xl overflow-hidden bg-[var(--wa-app-bg)] xl:rounded-xl border border-[var(--wa-border)]">

                <div className={cn(
                    "w-full md:w-[400px] border-r border-[var(--wa-border)] bg-[var(--wa-sidebar-bg)] flex flex-col transition-all duration-300 ease-in-out absolute md:relative z-20 h-full",
                    !showSidebar && "hidden md:flex",
                    // On mobile, if chat is active, hide sidebar or slide keys
                    isMobile && showContent && "-translate-x-full md:translate-x-0"
                )}>
                    <ChatSidebar />
                </div>

                <div className={cn(
                    "flex-1 bg-[var(--wa-app-bg)] w-full h-full transition-all duration-300 ease-in-out absolute md:relative z-10",
                    !showContent && isMobile && "translate-x-full",
                    showContent && isMobile && "translate-x-0"
                )}>
                    {/* Mobile Header Overlay to go back */}
                    {isMobile && showContent && (
                        <div className="absolute top-3 left-2 z-50">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-[var(--wa-text-secondary)] hover:text-[var(--wa-text-primary)] rounded-full bg-[var(--wa-header-bg)]/50 backdrop-blur-md"
                                onClick={() => {
                                    setActiveChatId(null);
                                    navigate('/chat');
                                }}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </div>
                    )}
                    <Outlet />
                </div>
            </div>

            {/* Floating Call Indicator (when minimized) */}
            {activeCall && isCallMinimized && (
                <div onClick={() => setIsCallMinimized(false)}>
                    <FloatingCallBar />
                </div>
            )}

            {/* Global Call Interface Overlay (when not minimized) */}
            {activeCall && !isCallMinimized && (
                <div className="absolute inset-0 z-50">
                    {/* Minimize button - tap back gesture */}
                    <button
                        onClick={() => setIsCallMinimized(true)}
                        className="absolute top-4 left-4 z-[60] p-2 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-colors"
                        aria-label="Minimize call"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <CallInterface
                        participant={activeCall.participant!}
                        type={activeCall.type}
                        onEnd={(duration, status, isRemote) => {
                            endCall(duration, status, isRemote);
                            setIsCallMinimized(false); // Reset minimize state when call ends
                        }}
                        isIncoming={activeCall.isIncoming}
                        offer={activeCall.offer}
                        participantId={activeCall.participant!.id}
                    />
                </div>
            )}
        </div>
    );
};
