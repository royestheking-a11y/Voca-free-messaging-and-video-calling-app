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
        const { participantId, type, status, duration, isIncoming } = req.body;

        // Map frontend status to schema status
        // Frontend sends: 'completed' or 'missed'
        // Schema expects: 'missed', 'received', 'outgoing'
        let mappedStatus = 'outgoing';
        if (status === 'missed') {
            mappedStatus = 'missed';
        } else if (status === 'completed') {
            mappedStatus = isIncoming ? 'received' : 'outgoing';
        }

        // De-duplication check:
        // Check if a call between these two users exists created within the last 10 seconds
        const recentCall = await Call.findOne({
            $or: [
                { callerId: req.user.userId, receiverId: participantId },
                { callerId: participantId, receiverId: req.user.userId }
            ],
            timestamp: { $gt: new Date(Date.now() - 10000) } // Created in last 10s
        });

        if (recentCall) {
            console.log('Duplicate call detected, returning existing record.');
            return res.json(recentCall);
        }

        const newCall = new Call({
            callerId: isIncoming ? participantId : req.user.userId,
            receiverId: isIncoming ? req.user.userId : participantId,
            type: type || 'voice',
            status: mappedStatus,
            duration: parseDuration(duration)
        });

        await newCall.save();
        res.status(201).json(newCall);
    } catch (error) {
        console.error('Error creating call:', error);
        res.status(500).json({ message: 'Error creating call', error: error.message });
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
