import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../../lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, ChevronUp, Lock } from 'lucide-react';
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

export const CallInterface = ({
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

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setIsVideoEnabled(initialType === 'video');
    }, [initialType]);

    // Initialize call
    useEffect(() => {
        const initCall = async () => {
            try {
                const stream = await webrtc.getUserMedia({
                    audio: true,
                    video: isVideo
                });
                localStreamRef.current = stream;

                if (localVideoRef.current && isVideo) {
                    localVideoRef.current.srcObject = stream;
                }

                const pc = webrtc.createPeerConnection();
                peerConnectionRef.current = pc;

                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });

                // Unified remote track handling for init call (video only)
                pc.ontrack = (event) => {
                    console.log('🎥 [INIT] ontrack received:', event.track.kind, 'enabled:', event.track.enabled);
                    // Only handle video tracks to avoid duplicate srcObject assignments
                    if (event.track.kind !== 'video') return;
                    if (!event.streams || !event.streams[0]) return;
                    const stream = event.streams[0];
                    remoteStreamRef.current = stream;
                    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== stream) {
                        console.log('📺 [INIT] Setting remote video srcObject');
                        remoteVideoRef.current.pause();
                        remoteVideoRef.current.srcObject = stream;
                        remoteVideoRef.current.play().catch(e => console.error('❌ Error playing remote video:', e));
                    }
                    setStatus('connected');
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
                    const offer = await webrtc.createOffer(pc);
                    socket?.emit('call:offer', {
                        to: participantId,
                        from: socket.id,
                        offer,
                        callType: isVideo ? 'video' : 'voice'
                    });
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

    // Handle Ringtone
    useEffect(() => {
        // Play ringtone only when incoming AND still in incoming status
        if (status === 'incoming') {
            // Only create new ringtone if one doesn't already exist
            if (!ringtoneRef.current) {
                console.log('🔔 Starting ringtone');
                const audio = new Audio('/sounds/ringtone.mp3');
                audio.src = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
                audio.loop = true;
                audio.play().catch(e => console.error('Error playing ringtone:', e));
                ringtoneRef.current = audio;
            }
        } else {
            // Stop ringtone when status changes (accepted, rejected, connected)
            if (ringtoneRef.current) {
                console.log('🔕 Stopping ringtone - status changed to:', status);
                ringtoneRef.current.pause();
                ringtoneRef.current.currentTime = 0; // Reset to beginning
                ringtoneRef.current = null;
            }
        }

        return () => {
            if (ringtoneRef.current) {
                console.log('🔕 Cleanup: Stopping ringtone');
                ringtoneRef.current.pause();
                ringtoneRef.current.currentTime = 0;
                ringtoneRef.current = null;
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

        socket.on('call:ended', () => {
            console.log('📞 CallInterface: Received call:ended from remote user');
            toast.info('Call ended');
            handleEnd(true); // Skip emitting to prevent infinite loop
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
        if (ringtoneRef.current) {
            console.log('🔕 FORCE STOP ringtone on accept');
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
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

            if (localVideoRef.current && isVideo) {
                localVideoRef.current.srcObject = stream;
            }

            const pc = webrtc.createPeerConnection();
            peerConnectionRef.current = pc;

            console.log('📹 [ACCEPT] Adding local tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
            console.log('✅ [ACCEPT] Tracks added to peer connection');

            // Unified remote track handling for accepted call
            // Unified remote track handling for accepted call
            pc.ontrack = (event) => {
                console.log('🎥 [ACCEPT] ontrack received:', event.track.kind, 'enabled:', event.track.enabled);
                if (!event.streams || !event.streams[0]) return;
                const stream = event.streams[0];
                remoteStreamRef.current = stream;
                if (event.track.kind === 'video' && remoteVideoRef.current) {
                    if (remoteVideoRef.current.srcObject !== stream) {
                        console.log('📺 [ACCEPT] Setting remote video srcObject');
                        remoteVideoRef.current.pause();
                        remoteVideoRef.current.srcObject = stream;
                        remoteVideoRef.current.play().catch(e => console.error('❌ Error playing remote video:', e));
                    }
                } else if (event.track.kind === 'audio' && remoteAudioRef.current) {
                    if (remoteAudioRef.current.srcObject !== stream) {
                        console.log('🔊 [ACCEPT] Setting remote audio srcObject');
                        remoteAudioRef.current.pause();
                        remoteAudioRef.current.srcObject = stream;
                        remoteAudioRef.current.play().catch(e => console.error('❌ Error playing remote audio:', e));
                    }
                }
                setStatus('connected');
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
                console.log('📞 [ACCEPT] Setting remote description (offer)');
                await webrtc.setRemoteDescription(pc, initialOffer);
                console.log('📞 [ACCEPT] Creating answer...');
                const answer = await webrtc.createAnswer(pc);
                console.log('📞 [ACCEPT] Answer created, emitting to caller');
                socket?.emit('call:answer', {
                    to: participantId,
                    answer
                });
                console.log('✅ [ACCEPT] Answer sent to caller');

                while (iceCandidatesQueue.current.length > 0) {
                    const candidate = iceCandidatesQueue.current.shift();
                    if (candidate) {
                        await webrtc.addIceCandidate(pc, candidate);
                    }
                }
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

    const handleEnd = (skipEmit = false) => {
        console.log('📞 CallInterface: handleEnd called', {
            participantId,
            socketConnected: socket?.connected,
            status,
            duration,
            skipEmit
        });

        if (socket && participantId && !skipEmit) {
            console.log('📞 CallInterface: Emitting call:end to', participantId);
            socket.emit('call:end', { to: participantId });
        } else if (skipEmit) {
            console.log('📞 CallInterface: Skipping call:end emission (remote ended)');
        } else {
            console.warn('⚠️ CallInterface: Cannot emit call:end - socket or participantId missing', {
                hasSocket: !!socket,
                socketConnected: socket?.connected,
                participantId
            });
        }

        cleanup();
        const m = Math.floor(duration / 60);
        const s = duration % 60;
        const durationStr = duration > 0 ? `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : undefined;
        const callStatus = isIncoming && status !== 'connected' ? 'missed' : 'completed';

        console.log('📞 CallInterface: Calling onEnd callback', { durationStr, callStatus, isRemote: skipEmit });
        onEnd(durationStr, callStatus, skipEmit); // Pass skipEmit as isRemote
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

    // 1. INCOMING CALL SCREEN (Premium)
    if (isIncoming) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex flex-col items-center justify-between"
                style={{
                    // Deep, colorful gradient background
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
                }}
            >
                {/* Floating Particles / Gradient Orbs */}
                <div className="absolute inset-0 overflow-hidden z-0">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0] }}
                        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                        className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-[120px]"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], x: [0, -50, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-[120px]"
                    />
                </div>

                {/* Header */}
                <div className="relative z-10 w-full pt-20 flex flex-col items-center">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10"
                    >
                        <span className="text-sm font-medium text-white/80">Incoming {isVideo ? 'Video' : 'Voice'} Call</span>
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative"
                    >
                        {/* Glowing Ring Animation */}
                        <motion.div
                            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 blur-xl opacity-50"
                        />
                        <Avatar className="w-32 h-32 border-[3px] border-white/20 shadow-2xl relative z-10">
                            <AvatarImage src={participant.avatar} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-3xl font-light text-white">
                                {participant.name[0]}
                            </AvatarFallback>
                        </Avatar>
                    </motion.div>

                    <h1 className="text-4xl text-white font-bold mt-8 mb-2 tracking-tight">{participant.name}</h1>
                    <p className="text-indigo-200/80 text-lg font-light">Voca Audio...</p>
                </div>

                {/* Bottom Actions - Premium Slide/Tap */}
                <div className="relative z-10 w-full px-8 pb-16 flex items-center justify-around">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleReject}
                        className="flex flex-col items-center gap-3 group"
                    >
                        <div className="w-16 h-16 rounded-full bg-red-500/10 backdrop-blur-md border border-red-500/20 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all duration-300 shadow-lg shadow-red-500/20">
                            <PhoneOff className="w-7 h-7" />
                        </div>
                        <span className="text-white/60 text-sm font-medium">Decline</span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAccept}
                        className="flex flex-col items-center gap-3 group"
                    >
                        <div className="w-20 h-20 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-[0_0_40px_rgba(0,168,132,0.4)] relative overflow-hidden group-hover:shadow-[0_0_60px_rgba(0,168,132,0.6)] transition-all duration-300">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 bg-white/20 rounded-full blur-md"
                            />
                            {isVideo ? (
                                <Video className="w-8 h-8 fill-current relative z-10" />
                            ) : (
                                <Phone className="w-8 h-8 fill-current relative z-10" />
                            )}
                        </div>
                        <span className="text-white/80 text-sm font-medium">Accept</span>
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    // 2. ACTIVE VIDEO CALL (Floating Controls)
    if (isVideo) {
        return (
            <motion.div
                className="fixed inset-0 z-[100] bg-black"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {/* Remote Video */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    onClick={() => setIsControlsVisible(!isControlsVisible)}
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

                {/* Local Video - Draggable Glass PiP */}
                <motion.div
                    drag
                    dragConstraints={{ left: -9999, right: 9999, top: -9999, bottom: 9999 }}
                    dragElastic={0}
                    dragMomentum={false}
                    whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
                    className="absolute right-4 top-28 w-32 h-48 rounded-2xl overflow-hidden shadow-2xl z-20 border-2 border-white/20 cursor-move group"
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm -z-10" />
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn("w-full h-full object-cover transition-opacity", !isVideoEnabled && "opacity-0")}
                    />
                    {!isVideoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center text-white/50">
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
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                                    onClick={toggleVideoState}
                                    className={cn("p-4 rounded-full transition-all", isVideoEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-black")}
                                >
                                    {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                                    onClick={toggleMute}
                                    className={cn("p-4 rounded-full transition-all", !isMuted ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-black")}
                                >
                                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handleEnd()}
                                    className="p-4 bg-red-500 rounded-full text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
                                >
                                    <PhoneOff className="w-6 h-6 fill-current" />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
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
