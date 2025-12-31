import express from 'express';
import Advertisement from '../models/Advertisement.js';

const router = express.Router();

// @route   GET /api/ads
// @desc    Get all active advertisements
// @access  Public
router.get('/', async (req, res) => {
    try {
        const ads = await Advertisement.find({ active: true }).sort({ createdAt: -1 });
        res.json(ads);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/ads/:id/click
// @desc    Increment ad click
// @access  Public
router.post('/:id/click', async (req, res) => {
    try {
        const ad = await Advertisement.findByIdAndUpdate(
            req.params.id,
            { $inc: { clicks: 1 } },
            { new: true }
        );
        res.json(ad);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/ads/:id/view
// @desc    Increment ad view
// @access  Public
router.post('/:id/view', async (req, res) => {
    try {
        const ad = await Advertisement.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        res.json(ad);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
