import express from 'express';
import mongoose from 'mongoose';
import Call from '../models/Call.js';
import { protect as authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// DEBUG ROUTE - Remove after fixing
router.get('/debug', authenticateToken, async (req, res) => {
    try {
        // Get current user ID
        const currentUserId = req.user.userId;
        const currentUserIdAsObjectId = new mongoose.Types.ObjectId(currentUserId);

        // Get first 10 calls (any calls, not filtered)
        const allCalls = await Call.find({}).limit(10).lean();

        // Get calls that match current user
        const userCalls = await Call.find({
            $or: [
                { callerId: currentUserId },
                { receiverId: currentUserId },
                { callerId: currentUserIdAsObjectId },
                { receiverId: currentUserIdAsObjectId }
            ]
        }).lean();

        res.json({
            debug: {
                currentUserId: currentUserId,
                currentUserIdType: typeof currentUserId,
                currentUserIdAsObjectId: currentUserIdAsObjectId.toString(),
                totalCallsInDB: await Call.countDocuments({}),
                allCallsSample: allCalls.map(call => ({
                    id: call._id,
                    callerId: call.callerId,
                    callerIdType: typeof call.callerId,
                    receiverId: call.receiverId,
                    receiverIdType: typeof call.receiverId,
                    type: call.type,
                    status: call.status,
                    timestamp: call.timestamp
                })),
                matchingCalls: userCalls.length,
                matchingCallsSample: userCalls.slice(0, 3)
            }
        });
    } catch (error) {
        console.error('Debug route error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

export default router;
