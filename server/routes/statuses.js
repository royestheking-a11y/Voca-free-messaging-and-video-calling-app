import express from 'express';
import Status from '../models/Status.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/statuses
// @desc    Get all active statuses
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const statuses = await Status.find({
            expiresAt: { $gt: new Date() }
        })
            .populate('userId', 'name avatar verified')
            .sort({ timestamp: -1 });

        // Filter out statuses from blocked users
        const filteredStatuses = statuses.filter(status => {
            if (req.user.blockedUsers?.includes(status.userId?._id)) return false;
            return true;
        });

        res.json(filteredStatuses);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/statuses
// @desc    Create a new status
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { mediaUrl, mediaType, caption } = req.body;

        const status = await Status.create({
            userId: req.user._id,
            mediaUrl,
            mediaType: mediaType || 'image',
            caption,
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        const populatedStatus = await Status.findById(status._id)
            .populate('userId', 'name avatar');

        res.status(201).json(populatedStatus);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/statuses/:id/view
// @desc    Mark status as viewed
// @access  Private
router.post('/:id/view', protect, async (req, res) => {
    try {
        await Status.findByIdAndUpdate(req.params.id, {
            $addToSet: { viewers: req.user._id }
        });
        res.json({ message: 'Status viewed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/statuses/:id
// @desc    Delete a status
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const status = await Status.findById(req.params.id);

        if (!status) {
            return res.status(404).json({ message: 'Status not found' });
        }

        if (status.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await status.deleteOne();
        res.json({ message: 'Status deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
