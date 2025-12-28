import express from 'express';
import Call from '../models/Call.js';
import { protect as authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all calls for current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const calls = await Call.find({
            $or: [{ callerId: req.user.userId }, { receiverId: req.user.userId }]
        })
            .sort({ timestamp: -1 })
            .populate('callerId', 'name avatar')
            .populate('receiverId', 'name avatar');

        // Transform for frontend
        const formattedCalls = calls.map(call => {
            const isCaller = call.callerId._id.toString() === req.user.userId;
            const otherUser = isCaller ? call.receiverId : call.callerId;

            // If populate failed (deleted user), handle gracefully
            if (!otherUser) return null;

            return {
                id: call._id,
                type: call.type,
                caller: {
                    id: otherUser._id,
                    name: otherUser.name,
                    avatar: otherUser.avatar,
                    online: false // status not stored in call history usually, fetched live
                },
                timestamp: call.timestamp,
                duration: call.duration ? formatDuration(call.duration) : '0:00',
                status: call.status, // 'missed', 'received', 'outgoing'
                direction: isCaller ? 'outgoing' : 'incoming'
            };
        }).filter(Boolean);

        res.json(formattedCalls);
    } catch (error) {
        console.error('Error fetching calls:', error);
        res.status(500).json({ message: 'Error fetching calls' });
    }
});

// Create a new call record
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { participantId, type, status, duration } = req.body;

        // Determine who is caller and receiver based on context
        // If I am creating the record after a call, I am usually the one who initiated OR the one who saving history?
        // Actually, usually the caller creates the record, or both do. 
        // To simplify: The person ENDING the call or initiating can save.
        // Let's assume the frontend sends enough info.

        // However, consistency depends on who calls the API. 
        // If I call 'startCall', I am the caller.
        // If I receive 'incoming', I am receiver.

        // For simplicity, let's say the Backend receives:
        // callerId (from token or body), receiverId (body), status, duration.

        // But the frontend 'createCall' usually implies "I just finished a call" or "I made a call".

        // Let's try to infer:
        // If direction is 'outgoing', req.user is caller.
        // If direction is 'incoming', req.user is receiver.
        // BUT, for 'missed' calls, the receiver might not even know to save it if they were offline?
        // Ideally, the SIGNALING server should save the call record when call starts/ends.
        // But since we are doing peer-to-peer and client-side saving for now:

        const call = new Call({
            callerId: req.user.userId, // We assume the one reporting the call is the one who 'made' it or we treat it as "I had a call with X"
            // Wait, if I received a call, and I save it, I shouldn't be 'callerId'.
            // Let's rely on frontend to tell us direction? 
            // Or better: The backend just stores "Call between A and B".

            // Let's follow the schema: callerId, receiverId.
            // If I picked up a call (incoming), I am receiver. participantId is caller.
            // If I started a call (outgoing), I am caller. participantId is receiver.
            // We need 'direction' from frontend or 'isIncoming'.
        });

        // Actually, let's just accept callerId and receiverId from body if possible, or derive from logic.
        // Better: client sends "I called X" or "X called me".

        const isIncoming = req.body.isIncoming; // boolean

        const newCall = new Call({
            callerId: isIncoming ? participantId : req.user.userId,
            receiverId: isIncoming ? req.user.userId : participantId,
            type,
            status, // 'missed', 'completed' -> schema has 'missed', 'received', 'outgoing'.
            // If I missed it, status is 'missed'.
            // If I accepted it, status is 'received' (if incoming) or 'outgoing' (if I called).
            duration: parseDuration(duration) // Convert "1:05" to seconds? Or store as is? Schema says Number (seconds).
        });

        await newCall.save();
        res.status(201).json(newCall);
    } catch (error) {
        console.error('Error creating call:', error);
        res.status(500).json({ message: 'Error creating call' });
    }
});

function parseDuration(durationStr) {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default router;
