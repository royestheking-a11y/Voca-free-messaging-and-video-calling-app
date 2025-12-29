import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../../lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, ChevronUp, Lock, Volume2 } from 'lucide-react';
import { cn } from '../../ui/utils';
import { useSocket } from '../SocketContext';
import * as webrtc from '../../../lib/webrtc';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface CallInterfaceProps {
    participant: User;
    type: 'voice' | 'video';
    onEnd: (duration?: string, status?: 'missed' | 'completed', isRemote?: boolean) => void;
    isIncoming?: boolean;
    offer?: RTCSessionDescriptionInit;
    participantId: string;
}

// Global singleton for ringtone to prevent double-playing or leaks
let globalRingtone: HTMLAudioElement | null = null;

const CallInterfaceComponent = ({
    participant,
    type: initialType,
    onEnd,
    isIncoming: initialIncoming,
    offer: initialOffer,
    participantId
}: CallInterfaceProps) => {
    const { socket } = useSocket();
    const [isVideo, setIsVideo] = useState(initialType === 'video');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
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
    }, [localStream]); // ONLY depend on localStream, not isIncoming/isVideo

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
    }, [remoteStream]); // ONLY depend on remoteStream

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
                            toast('Creating incoming call...'); // Subtle prompt
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
            toast.info('Call declined');
            handleEnd();
        });

        socket.on('call:ended', (data: { duration?: string, status?: 'missed' | 'completed' }) => {
            console.log('📞 CallInterface: Received call:ended from remote user', data);
            toast.info('Call ended');
            handleEnd(true, data.duration, data.status);
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

    const handleEnd = async (skipEmit = false, remoteDuration?: string, remoteStatus?: 'missed' | 'completed') => {
        console.log('📞 CallInterface: handleEnd called', {
            participantId,
            socketConnected: !!socket,
            status,
            duration,
            skipEmit,
            remoteDuration,
            remoteStatus
        });

        cleanup();

        // Calculate duration string
        const m = Math.floor(duration / 60);
        const s = duration % 60;
        const durationStr = duration > 0 ? `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : undefined;
        const callStatus = isIncoming && status !== 'connected' ? 'missed' : 'completed';

        if (!skipEmit && socket && participantId) {
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

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // --- RENDER ---

    // 1. INCOMING CALL SCREEN (Premium Design)
    if (isIncoming && status === 'incoming') {
        return (
            <div className="fixed inset-0 z-[100] bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                {/* Animated Background Effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 90, 0],
                        }}
                        transition={{ duration: 20, repeat: Infinity }}
                        className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{
                            scale: [1.2, 1, 1.2],
                            rotate: [0, -90, 0],
                        }}
                        transition={{ duration: 20, repeat: Infinity }}
                        className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 to-transparent rounded-full blur-3xl"
                    />
                </div>

                {/* Header - Voca Brand */}
                <div className="relative z-10 w-full pt-16 flex flex-col items-center">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex items-center gap-3 mb-4 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                            {isVideo ? (
                                <Video className="w-4 h-4 text-white" />
                            ) : (
                                <Phone className="w-4 h-4 text-white" />
                            )}
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                            Voca {isVideo ? 'Video' : 'Voice'} Call
                        </span>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/60 text-sm font-medium mb-8"
                    >
                        Incoming {isVideo ? 'video' : 'voice'} call...
                    </motion.p>

                    {/* Avatar with Pulse */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="relative mb-8"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 blur-2xl"
                        />
                        <motion.div
                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 blur-2xl"
                        />

                        <Avatar className="w-40 h-40 border-4 border-white/30 shadow-2xl relative z-10">
                            <AvatarImage src={participant.avatar} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-4xl font-bold text-white">
                                {participant.name[0]}
                            </AvatarFallback>
                        </Avatar>

                        <div className="absolute bottom-2 right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-purple-900 shadow-lg z-20" />
                    </motion.div>

                    <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-4xl font-bold text-white mb-2 drop-shadow-lg"
                    >
                        {participant.name}
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-white/70 text-lg mb-12"
                    >
                        {participant.email || 'Voca User'}
                    </motion.p>
                </div>

                {/* Action Buttons */}
                <div className="absolute bottom-20 left-0 right-0 flex justify-center items-center gap-8 px-8">
                    <motion.div
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-col items-center gap-3"
                    >
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleReject}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-2xl flex items-center justify-center relative overflow-hidden"
                        >
                            <motion.div
                                className="absolute inset-0 bg-white/20"
                                animate={{ scale: [1, 1.5, 1], opacity: [0, 0.5, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            <PhoneOff className="w-8 h-8 text-white relative z-10" />
                        </motion.button>
                        <span className="text-white font-semibold text-sm">Decline</span>
                    </motion.div>

                    <motion.div
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-col items-center gap-3"
                    >
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleAccept}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-2xl flex items-center justify-center relative overflow-hidden"
                        >
                            <motion.div
                                className="absolute inset-0 bg-white/20"
                                animate={{ scale: [1, 1.5, 1], opacity: [0, 0.5, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            {isVideo ? (
                                <Video className="w-8 h-8 text-white relative z-10" />
                            ) : (
                                <Phone className="w-8 h-8 text-white relative z-10" />
                            )}
                        </motion.button>
                        <span className="text-white font-semibold text-sm">Accept</span>
                    </motion.div>
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
                        top: -(window.innerHeight - 300), // Can drag up (leave some space at top)
                        left: -(window.innerWidth - 200), // Can drag left (leave some space)
                        right: window.innerWidth - 148,   // Can drag right
                        bottom: window.innerHeight - 212  // Can drag down
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
                            className="absolute bottom-8 left-0 right-0 z-30 flex justify-center"
                        >
                            <div className="flex items-center gap-4 px-6 py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                                <motion.button
                                    key="mute"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={toggleMute}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all",
                                        isMuted ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white hover:bg-white/10"
                                    )}
                                >
                                    {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                                    <span className="text-xs font-medium text-white">{isMuted ? 'Unmute' : 'Mute'}</span>
                                </motion.button>

                                <motion.button
                                    key="speaker"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => toast.info('Speaker toggled')}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all"
                                >
                                    <Volume2 className="w-7 h-7" />
                                    <span className="text-xs font-medium text-white">Speaker</span>
                                </motion.button>

                                <motion.button
                                    key="end"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleEnd()}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-500/90 text-white hover:bg-red-600 transition-all shadow-lg"
                                >
                                    <PhoneOff className="w-7 h-7" />
                                    <span className="text-xs font-medium text-white">End Call</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div >
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
            <div className="relative z-10 w-full pt-12 px-6 flex justify-between items-center opacity-70">
                <div className="p-2 rounded-full bg-white/5 backdrop-blur hover:bg-white/10 cursor-pointer">
                    <ChevronUp className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 backdrop-blur border border-white/5">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400/90 font-medium">End-to-end encrypted</span>
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
                <p className="text-slate-400 font-medium tracking-wide">{status === 'connected' ? formatDuration(duration) : 'Connecting...'}</p>

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
                        <span className="text-white/50 text-xs font-medium tracking-wide">Mute</span>
                    </button>

                    <button onClick={() => handleEnd()} className="flex flex-col items-center gap-2 group">
                        <div className="p-6 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/40 hover:bg-red-600 hover:scale-105 transition-all active:scale-95">
                            <PhoneOff className="w-8 h-8 fill-current" />
                        </div>
                        <span className="text-white/50 text-xs font-medium tracking-wide">End</span>
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
