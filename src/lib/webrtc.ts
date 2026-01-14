// WebRTC Utilities for Voice and Video Calling

// STUN and TURN servers for NAT traversal
// TURN servers are REQUIRED for mobile networks with carrier-grade NAT
const ICE_SERVERS: RTCIceServer[] = [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // OpenRelay TURN servers (free, public)
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    },
    {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    },
];

// Peer connection configuration
const PC_CONFIG: RTCConfiguration = {
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all', // Allow both relay and direct connections
};

/**
 * Create a new RTCPeerConnection with proper configuration
 */
export const createPeerConnection = (): RTCPeerConnection => {
    const pc = new RTCPeerConnection(PC_CONFIG);

    // Add connection state logging
    pc.onconnectionstatechange = () => {
        console.log('📞 Connection state:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
    };

    return pc;
};

/**
 * Request user media (camera and/or microphone)
 */
export const getUserMedia = async (constraints: { audio: boolean; video: boolean | MediaTrackConstraints }): Promise<MediaStream> => {
    try {
        // Build constraints with proper video settings
        const mediaConstraints: MediaStreamConstraints = {
            audio: constraints.audio ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } : false,
            video: constraints.video ? (
                typeof constraints.video === 'boolean' ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                } : constraints.video
            ) : false
        };

        console.log('📹 Requesting media with constraints:', mediaConstraints);
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        console.log('🎤 Got user media:', stream.getTracks().map(t => `${t.kind} (${t.enabled ? 'enabled' : 'disabled'})`));
        return stream;
    } catch (error) {
        console.error('❌ Error getting user media:', error);
        throw new Error(`Failed to access camera/microphone: ${(error as Error).message}. Please grant permissions.`);
    }
};

/**
 * Check if device/browser supports screen sharing
 */
export const canScreenShare = (): boolean => {
    // Check if getDisplayMedia is supported
    // Mobile browsers (iOS Safari, most Android browsers) don't support this
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
};

/**
 * Request display media (screen sharing)
 */
export const getDisplayMedia = async (): Promise<MediaStream> => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false // We typically handle audio via the microphone track separately
        });
        console.log('🖥️ Got display media (screen share):', stream.id);
        return stream;
    } catch (error) {
        console.error('❌ Error getting display media:', error);
        throw error;
    }
};

/**
 * Create an SDP offer
 */
export const createOffer = async (pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> => {
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        return offer;
    } catch (error) {
        console.error('❌ Error creating offer:', error);
        throw error;
    }
};

/**
 * Create an SDP answer
 */
export const createAnswer = async (pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> => {
    try {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        return answer;
    } catch (error) {
        console.error('❌ Error creating answer:', error);
        throw error;
    }
};

/**
 * Set remote description
 */
export const setRemoteDescription = async (
    pc: RTCPeerConnection,
    description: RTCSessionDescriptionInit
): Promise<void> => {
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(description));
    } catch (error) {
        console.error('❌ Error setting remote description:', error);
        throw error;
    }
};

/**
 * Add ICE candidate
 */
export const addIceCandidate = async (
    pc: RTCPeerConnection,
    candidate: RTCIceCandidateInit
): Promise<void> => {
    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
        // Don't throw, ICE candidates can fail gracefully
    }
};

/**
 * Replace the video track in a peer connection (used for switching between Camera/Screen)
 */
export const replaceVideoTrack = async (
    pc: RTCPeerConnection,
    newStream: MediaStream
): Promise<void> => {
    try {
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (!newVideoTrack) {
            console.warn('⚠️ No video track found in new stream');
            return;
        }

        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');

        if (videoSender) {
            console.log('🔄 Replacing video track with:', newVideoTrack.label);
            await videoSender.replaceTrack(newVideoTrack);
        } else {
            console.warn('⚠️ No video sender found to replace. This might be an audio-only call.');
            // Note: If we want to upgrade audio-only to video/screen, we would need to addTrack + renegotiate (createOffer/Answer)
            // For now, valid only for existing video calls or extensive renegotiation logic is needed.
        }
    } catch (error) {
        console.error('❌ Error replacing video track:', error);
        throw error;
    }
};

/**
 * Toggle audio track enabled/disabled
 */
export const toggleAudio = (stream: MediaStream, enabled: boolean): void => {
    stream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
    });
};

/**
 * Toggle video track enabled/disabled
 */
export const toggleVideo = (stream: MediaStream, enabled: boolean): void => {
    stream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
    });
};

/**
 * Stop all media tracks
 */
export const stopMediaStream = (stream: MediaStream): void => {
    stream.getTracks().forEach(track => {
        track.stop();
    });
    console.log('🛑 Stopped media stream');
};

/**
 * Close peer connection and clean up
 */
export const closePeerConnection = (pc: RTCPeerConnection): void => {
    pc.close();
    console.log('🔌 Closed peer connection');
};

/**
 * Switch Camera (Cycle through video inputs)
 */
export const switchCamera = async (
    pc: RTCPeerConnection,
    currentStream: MediaStream,
    facingMode: 'user' | 'environment' = 'user'
): Promise<MediaStream> => {
    try {
        // 1. Get current video track
        const currentVideoTrack = currentStream.getVideoTracks()[0];

        // 2. Stop current track to release device
        if (currentVideoTrack) {
            currentVideoTrack.stop();
            currentStream.removeTrack(currentVideoTrack);
        }

        // 3. Request new stream with opposite facing mode
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        console.log(`🔄 Switching camera to ${newFacingMode}...`);

        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { exact: newFacingMode }
            },
            audio: false
        });

        // 4. Replace sender track
        await replaceVideoTrack(pc, newStream);

        // 5. Return new stream
        return newStream;

    } catch (error) {
        console.warn('⚠️ Could not switch to specific facingMode, trying generic toggle...', error);
        try {
            // Fallback: If exact facingMode fails (e.g. desktop), just request any video.
            // Ideally we would enumerate and pick a different ID.
            // For MVP, if "exact" fails, we just re-request video, which might be same or default.
            // To be robust on desktop we need choose a different deviceId.
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            const currentTrack = currentStream.getVideoTracks()[0];
            const currentLabel = currentTrack?.label;

            // Find a device that is DIFFERENT from current
            const nextDevice = videoDevices.find(d => d.label !== currentLabel) || videoDevices[0];

            if (nextDevice) {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: nextDevice.deviceId } },
                    audio: false
                });
                await replaceVideoTrack(pc, newStream);
                return newStream;
            }

            throw error;
        } catch (e) {
            console.error('❌ Failed to switch camera:', e);
            throw e;
        }
    }
};

export const deviceHasMultipleCameras = async (): Promise<boolean> => {
    try {
        // First enumerate - might have limited info if no permissions yet
        let devices = await navigator.mediaDevices.enumerateDevices();
        let videoDevices = devices.filter(d => d.kind === 'videoinput');

        // If we have multiple devices with labels, we're good
        const devicesWithLabels = videoDevices.filter(d => d.label && d.label.trim() !== '');
        if (devicesWithLabels.length > 1) {
            return true;
        }

        // If we have multiple devices but no labels (no permission yet),
        // we can still assume multiple cameras exist
        if (videoDevices.length > 1) {
            return true;
        }

        // On mobile, even with one camera detected, facingMode might allow front/back toggle
        // Check if we're on mobile by looking for touch support
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isMobile && videoDevices.length >= 1) {
            // Mobile devices typically have front and back cameras
            // Return true to show the switch button
            return true;
        }

        return false;
    } catch (error) {
        console.warn('Error checking camera count:', error);
        // On error, assume mobile might have multiple cameras
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        return isMobile;
    }
};
