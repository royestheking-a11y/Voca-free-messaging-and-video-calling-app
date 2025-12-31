import express from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Helper function to filter user data based on privacy settings
const applyPrivacyFilter = (targetUser, requestingUser) => {
    const userData = targetUser.toJSON ? targetUser.toJSON() : { ...targetUser._doc, id: targetUser._id.toString() };
    const privacy = targetUser.settings?.privacy || {};
    const isContact = requestingUser?.favorites?.some(f => f.toString() === targetUser._id.toString());

    // Filter Last Seen
    if (privacy.lastSeen === 'nobody') {
        userData.lastSeen = null;
        userData.status = 'offline'; // Hide real status
    } else if (privacy.lastSeen === 'contacts' && !isContact) {
        userData.lastSeen = null;
        userData.status = 'offline';
    }

    // Filter Profile Photo
    if (privacy.profilePhoto === 'nobody') {
        userData.avatar = '';
        userData.photos = [];
    } else if (privacy.profilePhoto === 'contacts' && !isContact) {
        userData.avatar = '';
        userData.photos = [];
    }

    // Filter About
    if (privacy.about === 'nobody') {
        userData.about = '';
    } else if (privacy.about === 'contacts' && !isContact) {
        userData.about = '';
    }

    // Include read receipts preference for chat functionality
    userData.readReceiptsEnabled = privacy.readReceipts !== false;

    return userData;
};

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } })
            .select('-password')
            .sort({ name: 1 });

        // Apply privacy filters to each user
        const filteredUsers = users.map(user => applyPrivacyFilter(user, req.user));

        res.json(filteredUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Apply privacy filter based on requesting user
        const filteredUser = applyPrivacyFilter(user, req.user);

        res.json(filteredUser);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        // Only allow users to update their own profile (or admin can update any)
        if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this user' });
        }

        const updates = req.body;
        delete updates.password; // Don't allow password update through this route
        delete updates.role; // Don't allow role update through this route

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/users/:id/settings
// @desc    Update user settings
// @access  Private
router.put('/:id/settings', protect, async (req, res) => {
    try {
        if (req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { settings: req.body } },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/users/:id/block
// @desc    Block a user
// @access  Private
router.post('/:id/block', protect, async (req, res) => {
    try {
        const userToBlock = req.params.id;

        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { blockedUsers: userToBlock }
        });

        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/users/:id/unblock
// @desc    Unblock a user
// @access  Private
router.post('/:id/unblock', protect, async (req, res) => {
    try {
        const userToUnblock = req.params.id;

        await User.findByIdAndUpdate(req.user._id, {
            $pull: { blockedUsers: userToUnblock }
        });

        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/users/:id/favorite
// @desc    Add user to favorites
// @access  Private
router.post('/:id/favorite', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { favorites: req.params.id }
        });
        res.json({ message: 'Added to favorites' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/users/:id/favorite
// @desc    Remove user from favorites
// @access  Private
router.delete('/:id/favorite', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { favorites: req.params.id }
        });
        res.json({ message: 'Removed from favorites' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== ADMIN ROUTES =====

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Cascade Delete all user data
        // 1. Delete all messages sent by user
        await Message.deleteMany({ senderId: userId });

        // 2. Delete all status updates
        await import('../models/Status.js').then(m => m.default.deleteMany({ userId: userId }));

        // 3. Delete all posts
        await import('../models/Post.js').then(m => m.default.deleteMany({ author: userId }));

        // 4. Remove user from all chats (participants array)
        await Chat.updateMany(
            { participants: userId },
            { $pull: { participants: userId } }
        );

        // 5. Delete empty chats (if any remain after removal) or chats where they were the only participant
        const chats = await Chat.find({ participants: { $size: 0 } });
        for (const chat of chats) {
            await Message.deleteMany({ chatId: chat._id });
            await Chat.findByIdAndDelete(chat._id);
        }

        // 6. Delete reports filed BY them or AGAINST them
        await import('../models/Report.js').then(m => m.default.deleteMany({
            $or: [{ reporterId: userId }, { reportedUserId: userId }]
        }));

        res.json({ message: 'User and all associated data deleted successfully' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/users/:id/ban
// @desc    Ban user (Admin only)
// @access  Private/Admin
router.post('/:id/ban', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBanned: true },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/users/:id/unban
// @desc    Unban user (Admin only)
// @access  Private/Admin
router.post('/:id/unban', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBanned: false },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
