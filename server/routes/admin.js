import express from 'express';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import Status from '../models/Status.js';
import Advertisement from '../models/Advertisement.js';
import Report from '../models/Report.js';
import SystemSettings from '../models/SystemSettings.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(protect, adminOnly);

// ===== DASHBOARD STATS =====

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/stats', async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            newUsersToday,
            newUsersWeek,
            activeUsers,
            totalMessages,
            totalPosts,
            totalReports,
            pendingReports,
            bannedUsers
        ] = await Promise.all([
            User.countDocuments({ role: { $ne: 'admin' } }),
            User.countDocuments({ joinedAt: { $gte: today } }),
            User.countDocuments({ joinedAt: { $gte: lastWeek } }),
            User.countDocuments({ lastSeen: { $gte: lastMonth } }),
            Message.countDocuments(),
            Post.countDocuments(),
            Report.countDocuments(),
            Report.countDocuments({ status: 'pending' }),
            User.countDocuments({ isBanned: true })
        ]);

        // User growth data (last 7 days)
        const userGrowth = await Promise.all(
            Array.from({ length: 7 }).map(async (_, i) => {
                const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
                const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

                const users = await User.countDocuments({
                    joinedAt: { $gte: date, $lt: nextDate }
                });

                const messages = await Message.countDocuments({
                    timestamp: { $gte: date, $lt: nextDate }
                });

                return {
                    name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    users,
                    messages
                };
            })
        );

        res.json({
            totalUsers,
            newUsersToday,
            newUsersWeek,
            activeUsers,
            totalMessages,
            totalPosts,
            totalReports,
            pendingReports,
            bannedUsers,
            userGrowth
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== REPORTS =====

// @route   GET /api/admin/reports
// @desc    Get all reports
// @access  Private/Admin
router.get('/reports', async (req, res) => {
    try {
        const reports = await Report.find()
            .populate('reporterId', 'name avatar')
            .populate('reportedUserId', 'name avatar')
            .sort({ timestamp: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/admin/reports/:id
// @desc    Update report status
// @access  Private/Admin
router.put('/reports/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const report = await Report.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== ADVERTISEMENTS =====

// @route   GET /api/admin/ads
// @desc    Get all advertisements
// @access  Private/Admin
router.get('/ads', async (req, res) => {
    try {
        const ads = await Advertisement.find().sort({ createdAt: -1 });
        res.json(ads);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/admin/ads
// @desc    Create advertisement
// @access  Private/Admin
router.post('/ads', async (req, res) => {
    try {
        const ad = await Advertisement.create(req.body);
        res.status(201).json(ad);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/admin/ads/:id
// @desc    Update advertisement
// @access  Private/Admin
router.put('/ads/:id', async (req, res) => {
    try {
        const ad = await Advertisement.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(ad);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/admin/ads/:id
// @desc    Delete advertisement
// @access  Private/Admin
router.delete('/ads/:id', async (req, res) => {
    try {
        await Advertisement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Advertisement deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/admin/ads/:id/toggle
// @desc    Toggle advertisement active status
// @access  Private/Admin
router.post('/ads/:id/toggle', async (req, res) => {
    try {
        const ad = await Advertisement.findById(req.params.id);
        ad.active = !ad.active;
        await ad.save();
        res.json(ad);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== SYSTEM SETTINGS =====

// @route   GET /api/admin/settings
// @desc    Get system settings
// @access  Private/Admin
router.get('/settings', async (req, res) => {
    try {
        const settings = await SystemSettings.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/admin/settings
// @desc    Update system settings
// @access  Private/Admin
router.put('/settings', async (req, res) => {
    try {
        const settings = await SystemSettings.findOneAndUpdate(
            {},
            req.body,
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== BROADCAST =====

// @route   POST /api/admin/broadcast
// @desc    Send broadcast message to all users
// @access  Private/Admin
router.post('/broadcast', async (req, res) => {
    try {
        const { message } = req.body;

        // Get or create Voca Team user
        let vocaTeam = await User.findOne({ isVocaTeam: true });
        if (!vocaTeam) {
            vocaTeam = await User.create({
                name: 'Voca Team',
                email: 'team@voca.com',
                password: 'vocateam123',
                role: 'admin',
                isVocaTeam: true,
                verified: true,
                avatar: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=150&h=150&fit=crop',
                about: 'Official Voca Team - Announcements & Updates'
            });
        }

        // Get all regular users
        const users = await User.find({
            isVocaTeam: { $ne: true },
            role: { $ne: 'admin' },
            isBanned: { $ne: true }
        });

        // Create or update chats for each user
        for (const user of users) {
            let chat = await Chat.findOne({
                isGroup: false,
                participants: { $all: [vocaTeam._id, user._id], $size: 2 }
            });

            if (!chat) {
                chat = await Chat.create({
                    participants: [vocaTeam._id, user._id],
                    isGroup: false
                });
            }

            // Create message
            const msg = await Message.create({
                chatId: chat._id,
                senderId: vocaTeam._id,
                content: `📢 ${message}`,
                type: 'text',
                status: 'delivered',
                timestamp: new Date()
            });

            // Update chat
            chat.lastMessage = msg._id;
            chat.lastMessageTime = msg.timestamp;
            chat.unreadCount.set(user._id.toString(), (chat.unreadCount.get(user._id.toString()) || 0) + 1);
            await chat.save();
        }

        res.json({ message: `Broadcast sent to ${users.length} users` });
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== GOD MODE - ALL MESSAGES =====

// @route   GET /api/admin/messages
// @desc    Get all messages (God Mode)
// @access  Private/Admin
router.get('/messages', async (req, res) => {
    try {
        const { limit = 100, includeDeleted = 'true' } = req.query;

        const query = includeDeleted === 'false' ? { isDeleted: false } : {};

        const messages = await Message.find(query)
            .populate('senderId', 'name avatar')
            .populate('chatId', 'isGroup name')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/admin/messages/:id
// @desc    Force delete a message (God Mode)
// @access  Private/Admin
router.delete('/messages/:id', async (req, res) => {
    try {
        await Message.findByIdAndUpdate(req.params.id, {
            isDeleted: true,
            content: '[Removed by admin]'
        });
        res.json({ message: 'Message removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
