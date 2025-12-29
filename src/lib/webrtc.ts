// WebRTC Utilities for Voice and Video Calling

// STUN servers for NAT traversal
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
];

// Peer connection configuration
const PC_CONFIG: RTCConfiguration = {
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
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
