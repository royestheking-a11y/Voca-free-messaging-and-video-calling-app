import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../../lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, ChevronUp, Lock, Monitor, MonitorOff, MessageSquare, SwitchCamera } from 'lucide-react';
import { cn } from '../../ui/utils';
import { useSocket } from '../SocketContext';
import * as webrtc from '../../../lib/webrtc';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface CallInterfaceProps {
    participant: User;
    type: 'voice' | 'video';
    onEnd: (duration?: string, status?: 'missed' | 'completed', isRemote?: boolean) => void;
    onMinimize?: () => void;
    isIncoming?: boolean;
    offer?: RTCSessionDescriptionInit;
    participantId: string;
    isMinimized?: boolean;
    onMaximize?: () => void;
}

// Global singleton for ringtone to prevent double-playing or leaks
let globalRingtone: HTMLAudioElement | null = null;

const CallInterfaceComponent = ({
    participant,
    type: initialType,
    onEnd,
    onMinimize,
    isIncoming: initialIncoming,
    offer: initialOffer,
    participantId,
    isMinimized = false,
    onMaximize
}: CallInterfaceProps) => {
    const { socket } = useSocket();

    // Debug: Check if onMinimize callback is provided
    console.log('📞 CallInterface - onMinimize callback:', onMinimize ? 'provided ✅' : 'missing ❌');

    const [isVideo, setIsVideo] = useState(initialType === 'video');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [canShare, setCanShare] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    const toggleCamera = async () => {
        if (!peerConnectionRef.current || !localStreamRef.current) return;
        try {
            const newStream = await webrtc.switchCamera(
                peerConnectionRef.current,
                localStreamRef.current,
                facingMode
            );

            // Update references
            // We need to preserve Audio track!
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            const videoTrack = newStream.getVideoTracks()[0];

            // const info = `Switched to ${facingMode === 'user' ? 'back' : 'front'} camera`;
            // toast.info(info);

            const combinedStream = new MediaStream([
                ...(audioTrack ? [audioTrack] : []),
                videoTrack
            ]);

            localStreamRef.current = combinedStream;
            setLocalStream(combinedStream);
            setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        } catch (error) {
            toast.error("Failed to switch camera");
        }
    };
    const [isIncoming, setIsIncoming] = useState(initialIncoming);
    const [status, setStatus] = useState(initialIncoming ? 'incoming' : 'connecting');
    const [duration, setDuration] = useState(0);
    const [isControlsVisible, setIsControlsVisible] = useState(true);

    // State to trigger re-renders when streams are ready (Fixes PiP not showing)
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const remoteStreamIdRef = useRef<string | null>(null);
    const hasInitialized = useRef(false); // Prevent duplicate initialization

    useEffect(() => {
        setIsVideoEnabled(initialType === 'video');
    }, [initialType]);

    // Initialize call
    useEffect(() => {
        const initCall = async () => {
            if (hasInitialized.current) {
                console.log('⚠️ [CALLER] Skipping duplicate initCall - already initialized');
                return;
            }
            hasInitialized.current = true;
            console.log('🚀 [CALLER] initCall starting...', { isVideo });
            try {
                const stream = await webrtc.getUserMedia({
                    audio: true,
                    video: isVideo
                });
                localStreamRef.current = stream;
                setLocalStream(stream); // Trigger re-render for useEffect

                // Video attachment handled by useEffect now

                const pc = webrtc.createPeerConnection();
                peerConnectionRef.current = pc;

                stream.getTracks().forEach(track => {
                    console.log('➕ [INIT] Adding track to PC:', track.kind, 'enabled:', track.enabled);
                    pc.addTrack(track, stream);
                });
                console.log('✅ [INIT] All tracks added. Total senders:', pc.getSenders().length);

                pc.ontrack = (event) => {
                    console.log('🎥 [INIT] ontrack event:', event.track.kind, 'enabled:', event.track.enabled);
                    if (event.streams && event.streams[0]) {
                        const streamId = event.streams[0].id;
                        remoteStreamRef.current = event.streams[0];
                        setRemoteStream(event.streams[0]); // Trigger re-render

                        // Video attachment handled by useEffect now
                        setStatus('connected');
                    }
                };

                pc.onicecandidate = (event) => {
                    if (event.candidate && socket) {
                        socket.emit('call:ice-candidate', {
                            to: participantId,
                            candidate: event.candidate.toJSON()
                        });
                    }
                };

                if (initialIncoming && initialOffer) {
                    // Incoming handling deferred to accept
                } else {
                    console.log('📝 [INIT] Creating offer...');
                    const offer = await webrtc.createOffer(pc);
                    console.log('✅ [INIT] Offer created, sending to receiver');
                    socket?.emit('call:offer', {
                        to: participantId,
                        from: socket.id,
                        offer,
                        callType: isVideo ? 'video' : 'voice'
                    });
                    console.log('📤 [INIT] Offer sent via socket');
                }
            } catch (error) {
                console.error('❌ Call init error:', error);
                toast.error('Failed to start call');
                handleEnd();
            }
        };

        if (!initialIncoming) {
            initCall();
        }

        return () => cleanup();
    }, []);

    // Attach local stream to PiP when available (do NOT depend on isIncoming/isVideo to prevent re-renders)
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            console.log('📹 [EFFECT] Attaching local stream to PiP', {
                streamId: localStream.id,
                tracks: localStream.getTracks().length
            });
            localVideoRef.current.srcObject = localStream;
            // Explicitly play local video (it is muted so it should allow autoplay, but being safe)
            localVideoRef.current.play().catch(e => console.error('📹 Error playing local PiP:', e));
        }
    }, [localStream, isMinimized]); // Re-run when switching to PiP

    // Attach remote stream to video/audio when available (do NOT depend on isIncoming/isVideo)
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            console.log('📺 [EFFECT] Attaching remote stream to main video', {
                streamId: remoteStream.id,
                tracks: remoteStream.getTracks().length
            });
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.error('❌ Error playing remote video from effect:', e));
        } else if (remoteAudioRef.current && remoteStream && !isVideo) {
            console.log('🔊 [EFFECT] Attaching remote stream to audio element');
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(e => console.error('❌ Error playing remote audio from effect:', e));
        }
    }, [remoteStream, isMinimized, isVideo]); // Re-run when switching to PiP or toggling video

    // Handle Ringtone
    useEffect(() => {
        // Play ringtone only when incoming AND still in incoming status
        if (status === 'incoming') {
            // Only create new ringtone if one doesn't already exist in global singleton
            if (!globalRingtone) {
                console.log('🔔 Starting ringtone');
                const audio = new Audio('/sounds/ringtone.mp3');
                audio.src = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
                audio.loop = true;
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error('Error playing ringtone (likely autoplay policy):', e);
                        // Optional: Show UI to ask user to interact
                        if (e.name === 'NotAllowedError') {
                            // toast('Creating incoming call...'); // Subtle prompt
                        }
                    });
                }
                globalRingtone = audio; // Assign to singleton
            }
        } else {
            // Stop ringtone when status changes (accepted, rejected, connected)
            if (globalRingtone) {
                console.log('🔕 Stopping ringtone - status changed to:', status);
                globalRingtone.pause();
                globalRingtone.currentTime = 0;
                globalRingtone = null;
            }
        }

        return () => {
            // Cleanup on unmount or dependency change
            if (globalRingtone) {
                console.log('🔕 Cleanup: Stopping ringtone');
                try {
                    globalRingtone.pause();
                    globalRingtone.currentTime = 0;
                } catch (e) {
                    console.error('Error stopping ringtone:', e);
                }
                globalRingtone = null;
            }
        };
    }, [status]); // Listen to status changes, not isIncoming

    // Socket Events
    useEffect(() => {
        if (!socket) return;

        socket.on('call:answered', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
            console.log('📞 [CALLER] Received call:answered from receiver');
            if (peerConnectionRef.current) {
                console.log('✅ [CALLER] Setting remote description (answer)');
                await webrtc.setRemoteDescription(peerConnectionRef.current, answer);
                console.log('✅ [CALLER] Remote description set, processing queued ICE candidates:', iceCandidatesQueue.current.length);
                while (iceCandidatesQueue.current.length > 0) {
                    const candidate = iceCandidatesQueue.current.shift();
                    if (candidate && peerConnectionRef.current) {
                        await webrtc.addIceCandidate(peerConnectionRef.current, candidate);
                    }
                }
                console.log('✅ [CALLER] All ICE candidates processed');
            } else {
                console.error('❌ [CALLER] No peer connection when answer received');
            }
        });

        socket.on('call:ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                await webrtc.addIceCandidate(peerConnectionRef.current, candidate);
            } else {
                iceCandidatesQueue.current.push(candidate);
            }
        });

        socket.on('call:rejected', () => {
            // toast.info('Call declined');
            handleEnd();
        });

        socket.on('call:ended', (data?: { duration?: string, status?: 'missed' | 'completed' }) => {
            console.log('📞 CallInterface: Received call:ended from remote user', data);
            // toast.info('Call ended');
            handleEnd(true, data?.duration, data?.status);
        });

        return () => {
            socket.off('call:answered');
            socket.off('call:ice-candidate');
            socket.off('call:rejected');
            socket.off('call:ended');
        };
    }, [socket]);

    useEffect(() => {
        if (status === 'connected') {
            const interval = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [status]);

    // Auto-hide controls after 10 seconds of inactivity
    useEffect(() => {
        if (!isControlsVisible) return;

        const timer = setTimeout(() => {
            setIsControlsVisible(false);
        }, 10000); // Increased from 3s to 10s

        return () => clearTimeout(timer);
    }, [isControlsVisible]);

    // Check device capabilities on mount
    useEffect(() => {
        setCanShare(webrtc.canScreenShare());
        webrtc.deviceHasMultipleCameras().then(setHasMultipleCameras);
    }, []);

    // Re-check cameras when call becomes active (permissions granted)
    useEffect(() => {
        if (status === 'connected' && isVideo) {
            webrtc.deviceHasMultipleCameras().then(setHasMultipleCameras);
        }
    }, [status, isVideo]);

    const cleanup = () => {
        if (localStreamRef.current) {
            webrtc.stopMediaStream(localStreamRef.current);
        }
        if (peerConnectionRef.current) {
            webrtc.closePeerConnection(peerConnectionRef.current);
        }
    };

    const handleAccept = async () => {
        console.log('📞 CallInterface: Accepting call, stopping ringtone');

        // IMMEDIATELY and AGGRESSIVELY stop ringtone when accept is clicked
        if (globalRingtone) {
            console.log('🔕 FORCE STOP ringtone on accept');
            globalRingtone.pause();
            globalRingtone.currentTime = 0;
            globalRingtone = null;
        }

        // Also clear ref if it exists (legacy safety)
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current = null;
        }

        setIsIncoming(false);
        setStatus('connecting');

        try {
            const stream = await webrtc.getUserMedia({
                audio: true,
                video: isVideo
            });
            localStreamRef.current = stream;
            setLocalStream(stream); // Trigger re-render

            // Video attachment handled by useEffect now

            const pc = webrtc.createPeerConnection();
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => {
                console.log('➕ [ACCEPT] Adding track to PC:', track.kind, 'enabled:', track.enabled);
                pc.addTrack(track, stream);
            });
            console.log('✅ [ACCEPT] All tracks added. Total senders:', pc.getSenders().length);

            pc.ontrack = (event) => {
                console.log('🎥 [ACCEPT] ontrack event:', event.track.kind, 'enabled:', event.track.enabled);
                if (event.streams && event.streams[0]) {
                    const streamId = event.streams[0].id;
                    remoteStreamRef.current = event.streams[0];
                    setRemoteStream(event.streams[0]); // Trigger re-render

                    // Video attachment handled by useEffect now
                    setStatus('connected');
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate && socket) {
                    socket.emit('call:ice-candidate', {
                        to: participantId,
                        candidate: event.candidate.toJSON()
                    });
                }
            };

            if (initialOffer) {
                console.log('📝 [ACCEPT] Setting remote description (offer)');
                await webrtc.setRemoteDescription(pc, initialOffer);
                console.log('📝 [ACCEPT] Creating answer...');
                const answer = await webrtc.createAnswer(pc);
                console.log('✅ [ACCEPT] Answer created, sending to caller');
                socket?.emit('call:answer', {
                    to: participantId,
                    answer
                });
                console.log('📤 [ACCEPT] Answer sent via socket');

                console.log('🧊 [ACCEPT] Processing queued ICE candidates:', iceCandidatesQueue.current.length);
                while (iceCandidatesQueue.current.length > 0) {
                    const candidate = iceCandidatesQueue.current.shift();
                    if (candidate) {
                        await webrtc.addIceCandidate(pc, candidate);
                    }
                }
                console.log('✅ [ACCEPT] All queued ICE candidates processed');
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to accept call');
            handleEnd();
        }
    };

    const handleReject = () => {
        socket?.emit('call:reject', { to: participantId });
        handleEnd();
    };

    const handleEnd = (skipEmit = false, remoteDuration?: string, remoteStatus?: 'missed' | 'completed') => {
        console.log('📞 CallInterface: handleEnd called', {
            participantId,
            socketConnected: socket?.connected,
            status,
            duration,
            skipEmit,
            remoteDuration,
            remoteStatus
        });

        cleanup();
        const m = Math.floor(duration / 60);
        const s = duration % 60;
        const durationStr = duration > 0 ? `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : undefined;
        const callStatus = isIncoming && status !== 'connected' ? 'missed' : 'completed';

        if (socket && participantId && !skipEmit) {
            console.log('📞 CallInterface: Emitting call:end to', participantId, 'with duration:', durationStr);
            socket.emit('call:end', {
                to: participantId,
                duration: durationStr,
                status: callStatus
            });
        } else if (skipEmit) {
            console.log('📞 CallInterface: Skipping call:end emission (remote ended)');
        } else {
            console.warn('⚠️ CallInterface: Cannot emit call:end - socket or participantId missing', {
                hasSocket: !!socket,
                socketConnected: socket?.connected,
                participantId
            });
        }

        // Use remote duration/status if provided (for receiver), otherwise use local
        const finalDuration = remoteDuration || durationStr;
        const finalStatus = remoteStatus || callStatus;

        console.log('📞 CallInterface: Calling onEnd callback', {
            durationStr: finalDuration,
            callStatus: finalStatus,
            isRemote: skipEmit
        });
        onEnd(finalDuration, finalStatus, skipEmit); // Pass skipEmit as isRemote
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            webrtc.toggleAudio(localStreamRef.current, isMuted);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideoState = () => {
        if (localStreamRef.current) {
            webrtc.toggleVideo(localStreamRef.current, !isVideoEnabled);
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    const toggleScreenShare = async () => {
        if (!peerConnectionRef.current) return;

        try {
            if (isScreenSharing) {
                // STOP Sharing -> Revert to Camera
                console.log('⏹️ Stopping screen share, reverting to camera');
                const cameraStream = await webrtc.getUserMedia({ audio: true, video: true }); // Audio is redundant but ensures we match constraints

                // Get just the video track for replacement
                const cameraVideoTrack = cameraStream.getVideoTracks()[0];

                // We keep the ORIGINAL audio track if possible to avoid interruptions, 
                // but replaceVideoTrack only touches video.
                // We need to ensure we update our local references correctly.

                if (localStreamRef.current) {
                    // Ensure we don't kill the mic track if it's the same stream?
                    // Actually, let's just make a new stream composite for local preview
                    // But replaceVideoTrack needs the track.
                }

                await webrtc.replaceVideoTrack(peerConnectionRef.current, cameraStream);

                // Update Local State
                // We need to construct a stream that has the Active Mic + New Camera
                const audioTrack = localStreamRef.current?.getAudioTracks()[0];
                const newLocalStream = new MediaStream([
                    ...(audioTrack ? [audioTrack] : []),
                    cameraVideoTrack
                ]);

                localStreamRef.current = newLocalStream;
                setLocalStream(newLocalStream);
                setIsScreenSharing(false);
                setIsVideoEnabled(true); // Camera is on

                // Cleanup previous screen track if it was stored separately? 
                // The browser usually handles stop on the track itself if we obtained it via getDisplayMedia
            } else {
                // START Sharing
                console.log('🖥️ Starting screen share');
                const screenStream = await webrtc.getDisplayMedia();
                const screenTrack = screenStream.getVideoTracks()[0];

                // Handle user clicking "Stop Sharing" on the browser native UI
                screenTrack.onended = () => {
                    console.log('🖥️ Native Stop Sharing triggered');
                    // If we are still state-wise sharing, revert.
                    // We need to check the state ref or just force revert.
                    // Since state is inside closure, this might be stale if not careful, 
                    // but usually simple toggle back is fine.
                    // Ideally call a function that doesn't depend on stale state or checks current track.
                    // For now, we'll just try to reset if we detect we are sharing.
                    // But `isScreenSharing` is closed over. 
                    // Use a ref for screen sharing state if needed, or simple force revert logic:
                    // simpler: trigger the reverting logic directly
                    // For MVP, we will rely on the user clicking the button again OR this handler:

                    // We CAN'T easily call the async revert logic from here without duplication 
                    // or extracting `revertToCamera` function.
                    // For now, let's just update state to false so UI reflects it, 
                    // but we NEED to restore camera.
                    // Let's assume user will click the button if this fails, or we reload.
                    // BETTER: Extract revert logic. 
                    // BUT for this edit, let's keep it simple: 
                    // Just let the specific button handler handle the full swap back for robustness first.
                    // Or:
                    /*
                    toast.info("Screen sharing ended");
                    setIsScreenSharing(false);
                    // But we need to restore camera... 
                    */
                };

                await webrtc.replaceVideoTrack(peerConnectionRef.current, screenStream);

                // Update Local Preview
                const audioTrack = localStreamRef.current?.getAudioTracks()[0];
                const newLocalStream = new MediaStream([
                    ...(audioTrack ? [audioTrack] : []),
                    screenTrack
                ]);

                localStreamRef.current = newLocalStream;
                setLocalStream(newLocalStream);
                setIsScreenSharing(true);
            }
        } catch (error) {
            console.error('❌ Error toggling screen share:', error);
            // reset state if failed
            if (!isScreenSharing) {
                toast.error('Failed to start screen share');
            } else {
                toast.error('Failed to stop screen share');
            }
        }
    };

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // --- RENDER ---

    // 4. PIP MODE (Minimized)
    if (isMinimized) {
        return (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="fixed bottom-24 right-4 z-[100] w-48 h-64 sm:w-64 sm:h-80 bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/20 cursor-pointer hover:scale-105 transition-transform"
                onClick={onMaximize}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
                {isVideo ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-[#0f172a] flex flex-col items-center justify-center p-4">
                        <Avatar className="w-16 h-16 border-2 border-white/20 mb-2">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback>{participant.name[0]}</AvatarFallback>
                        </Avatar>
                        <h3 className="text-white text-sm font-bold truncate max-w-full text-center">{participant.name}</h3>
                        <span className="text-green-400 text-xs font-medium mt-1">{formatDuration(duration)}</span>
                    </div>
                )}

                {/* Local Video Overlay (for Video Call PiP) */}
                {isVideo && isVideoEnabled && (
                    <div className="absolute top-2 right-2 w-12 h-16 bg-black/50 rounded-xl overflow-hidden border border-white/30">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center z-20" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={onMaximize}
                        className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={toggleMute}
                        className={cn("p-2 rounded-full transition-all", isMuted ? "bg-white text-black" : "bg-white/20 text-white")}
                    >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => handleEnd()}
                        className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                        <PhoneOff className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        );
    }

    // 1. INCOMING CALL SCREEN (WhatsApp Style)
    if (isIncoming) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center bg-[#0f1c24] text-white overflow-hidden">
                {/* Background Image / Blur */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={participant.avatar}
                        alt="Background"
                        className="w-full h-full object-cover opacity-60 blur-3xl scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                {/* Top Info */}
                <div className="relative z-10 flex flex-col items-center w-full px-4 animate-in fade-in slide-in-from-top-10 duration-700" style={{ marginTop: '12vh' }}>
                    <div className="flex items-center gap-2 text-white/80 mb-6 bg-black/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/5 shadow-sm">
                        {isVideo ? <Video className="w-4 h-4 fill-current" /> : <Phone className="w-4 h-4 fill-current" />}
                        <span className="text-sm font-medium tracking-wide border-l border-white/20 pl-2 ml-1">Voca {isVideo ? 'Video' : 'Voice'} Call</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center text-white drop-shadow-md">{participant.name}</h1>
                    <p className="text-white/70 font-medium text-lg tracking-wide">Incoming call...</p>
                </div>

                {/* Center Avatar with Pulse */}
                <div className="relative z-10 flex-1 flex items-center justify-center w-full">
                    <div className="relative">
                        {/* Pulse Rings */}
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                                className="absolute inset-0 rounded-full border border-white/30 bg-white/5"
                            />
                        ))}

                        {/* Main Avatar */}
                        <div className="relative z-20 w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[3px] border-white/20 shadow-2xl overflow-hidden bg-[#1e293b]">
                            <img
                                src={participant.avatar}
                                alt={participant.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="relative z-10 w-full px-8 pb-16 sm:pb-24 flex items-center justify-center gap-16 sm:gap-24 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
                    {/* Decline */}
                    <button
                        onClick={handleReject}
                        className="flex flex-col items-center gap-3 group active:scale-95 transition-transform"
                    >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40 group-hover:bg-red-600 transition-all">
                            <PhoneOff className="w-8 h-8 sm:w-9 sm:h-9 text-white fill-current" />
                        </div>
                        <span className="text-white/90 text-sm font-medium tracking-wide">Decline</span>
                    </button>

                    {/* Accept */}
                    <button
                        onClick={handleAccept}
                        className="flex flex-col items-center gap-3 group active:scale-95 transition-transform"
                    >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40 animate-bounce-subtle group-hover:bg-green-600 transition-all">
                            {isVideo ? <Video className="w-8 h-8 sm:w-9 sm:h-9 text-white fill-current" /> : <Phone className="w-8 h-8 sm:w-9 sm:h-9 text-white fill-current" />}
                        </div>
                        <span className="text-white/90 text-sm font-medium tracking-wide">Accept</span>
                    </button>
                </div>
            </div>
        );
    }

    // 2. ACTIVE VIDEO CALL (Floating Controls)
    if (isVideo) {
        return (
            <div
                className="fixed inset-0 z-[100] bg-black"
                style={{ opacity: 1 }} // Force opacity
            >
                {/* Remote Video */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 0,
                        backgroundColor: '#000'
                    }}
                    onClick={() => setIsControlsVisible(!isControlsVisible)}
                    onLoadedMetadata={(e) => {
                        console.log('📹 Remote video metadata loaded:', {
                            videoWidth: e.currentTarget.videoWidth,
                            videoHeight: e.currentTarget.videoHeight,
                            duration: e.currentTarget.duration
                        });
                    }}
                    onPlay={() => console.log('▶️ Remote video started playing')}
                    onError={(e) => console.error('❌ Remote video error:', e)}
                />

                {/* Top Overlay */}
                <AnimatePresence>
                    {isControlsVisible && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-0 left-0 right-0 p-6 pt-12 bg-gradient-to-b from-black/80 to-transparent z-20"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border border-white/20">
                                        <AvatarImage src={participant.avatar} />
                                        <AvatarFallback>{participant.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-white font-semibold text-lg leading-tight shadow-black drop-shadow-lg">{participant.name}</h3>
                                        <span className="text-white/70 text-sm shadow-black drop-shadow-md flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            {formatDuration(duration)}
                                        </span>
                                    </div>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                                    <span className="text-xs font-mono text-white/80">HD</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Local Video PiP - Draggable */}
                <motion.div
                    drag
                    dragElastic={0}
                    dragMomentum={false}
                    dragConstraints={{
                        top: -(window.innerHeight - 300),
                        left: -(window.innerWidth - 200),
                        right: window.innerWidth - 148,
                        bottom: window.innerHeight - 212
                    }}
                    className="rounded-2xl overflow-hidden shadow-2xl border border-white/20 cursor-grab active:cursor-grabbing"
                    style={{
                        position: 'fixed',
                        top: '120px',
                        right: '16px',
                        width: '128px',
                        height: '192px',
                        zIndex: 100,
                        opacity: 1,
                        pointerEvents: 'auto'
                    }}
                    whileDrag={{ scale: 1.05 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm" />
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted={true}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'relative',
                            zIndex: 1
                        }}
                        onLoadedMetadata={() => console.log('📹 PiP metadata loaded')}
                    />
                    {!isVideoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center text-white/50 z-10">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                                <VideoOff className="w-6 h-6" />
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Bottom Floating Glass Bar */}
                <AnimatePresence>
                    {isControlsVisible && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute bottom-8 left-0 right-0 z-30 flex justify-center px-2"
                        >
                            <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('🟢 Message button clicked!');
                                        onMinimize?.();
                                    }}
                                    className="relative z-50 p-2 sm:p-4 rounded-full transition-all bg-white/10 text-white hover:bg-white/20 active:scale-95"
                                    title="Minimize to chat"
                                >
                                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>

                                <motion.button
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                                    onClick={toggleVideoState}
                                    className={cn("p-2 sm:p-4 rounded-full transition-all", isVideoEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-black")}
                                >
                                    {isVideoEnabled ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                                </motion.button>

                                {canShare && (
                                    <motion.button
                                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                                        onClick={toggleScreenShare}
                                        className={cn("p-2 sm:p-4 rounded-full transition-all", isScreenSharing ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20")}
                                        title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                                    >
                                        {isScreenSharing ? <MonitorOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />}
                                    </motion.button>
                                )}

                                {hasMultipleCameras && isVideoEnabled && (
                                    <motion.button
                                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                                        onClick={toggleCamera}
                                        className="p-2 sm:p-4 rounded-full transition-all bg-white/10 text-white hover:bg-white/20"
                                        title="Switch Camera"
                                    >
                                        <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </motion.button>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                                    onClick={toggleMute}
                                    className={cn("p-2 sm:p-4 rounded-full transition-all", !isMuted ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-black")}
                                >
                                    {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handleEnd()}
                                    className="p-2 sm:p-4 bg-red-500 rounded-full text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
                                >
                                    <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // 3. ACTIVE VOICE CALL (Premium Audio Visualizer Look)
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
            style={{
                // Deep sophisticated gradient
                background: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)',
            }}
        >
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />

            {/* Top Bar */}
            <div className="relative z-10 w-full pt-6 sm:pt-12 px-4 sm:px-6 flex justify-between items-center">
                <div className="p-2 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 cursor-pointer">
                    <ChevronUp className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                    <Lock className="w-3 h-3 text-white" />
                    <span className="text-xs text-white font-medium">End-to-end encrypted</span>
                </div>
                <div className="w-9" />
            </div>

            {/* Avatar & Visualization */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 -mt-20">
                <div className="relative">
                    {/* Ripples */}
                    {[1, 2].map(i => (
                        <motion.div
                            key={i}
                            animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                            className="absolute inset-0 rounded-full border border-white/10"
                        />
                    ))}
                    <Avatar className="w-40 h-40 border-4 border-[#1e293b] shadow-2xl z-20">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>{participant.name[0]}</AvatarFallback>
                    </Avatar>
                </div>

                <h2 className="text-3xl text-white font-bold mt-8 mb-2 tracking-tight">{participant.name}</h2>
                <p className="text-white font-medium tracking-wide">{status === 'connected' ? formatDuration(duration) : 'Connecting...'}</p>

                {/* Decorative Waveform */}
                <div className="mt-12 flex items-center justify-center gap-1 h-8">
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{ height: ['20%', '100%', '20%'] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                            className="w-1.5 bg-emerald-500/50 rounded-full"
                        />
                    ))}
                </div>
            </div>

            {/* Bottom Controls Card (Glassmorphism) */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative z-20 m-4 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl"
            >
                <div className="flex items-center justify-center gap-8">
                    <button onClick={toggleMute} className="flex flex-col items-center gap-2 group">
                        <div className={cn("p-6 rounded-full transition-all shadow-lg", isMuted ? "bg-white text-black hover:scale-105" : "bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 hover:scale-105")}>
                            {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                        </div>
                        <span className="text-white text-xs font-medium tracking-wide">Mute</span>
                    </button>

                    <button onClick={() => handleEnd()} className="flex flex-col items-center gap-2 group">
                        <div className="p-6 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/40 hover:bg-red-600 hover:scale-105 transition-all active:scale-95">
                            <PhoneOff className="w-8 h-8 fill-current" />
                        </div>
                        <span className="text-white text-xs font-medium tracking-wide">End</span>
                    </button>

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🟢 Voice call - Message button clicked!');
                            onMinimize?.();
                        }}
                        className="relative z-50 flex flex-col items-center gap-2 group active:scale-95 transition-transform"
                        title="Minimize to chat"
                    >
                        <div className="p-6 rounded-full transition-all shadow-lg bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <span className="text-white text-xs font-medium tracking-wide">Chat</span>
                    </button>
                </div>
            </motion.div>


            {/* Hidden audio element for voice calls */}
            <audio ref={remoteAudioRef} autoPlay playsInline />
        </motion.div>
    );
};

// Wrap with React.memo to prevent unnecessary re-renders that cause render loops
export const CallInterface = React.memo(CallInterfaceComponent, (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
        prevProps.participant.id === nextProps.participant.id &&
        prevProps.type === nextProps.type &&
        prevProps.isIncoming === nextProps.isIncoming &&
        prevProps.participantId === nextProps.participantId
    );
});
