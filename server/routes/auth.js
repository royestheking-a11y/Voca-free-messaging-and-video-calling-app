import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, avatar, photos, age, gender, location, interests, bio } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create user
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            avatar: avatar || '',
            photos: photos || [],
            age,
            gender,
            location,
            interests,
            bio,
            joinedAt: new Date()
        });

        // Create a chat with Voca Team for welcome message
        const vocaTeam = await User.findOne({ isVocaTeam: true });
        if (vocaTeam) {
            const chat = await Chat.create({
                participants: [vocaTeam._id, user._id],
                isGroup: false,
                unreadCount: new Map([[user._id.toString(), 1]])
            });

            // Create welcome message
            const welcomeMessage = await Message.create({
                chatId: chat._id,
                senderId: vocaTeam._id,
                content: `👋 Welcome to Voca, ${name}!\n\nWe're thrilled to have you here! Voca is your space to connect, chat, and share moments with people who matter.\n\n✨ Tips to get started:\n• Complete your profile to let others know you\n• Explore and connect with new people\n• Share your first status update\n\nIf you have any questions, we're here to help. Enjoy your journey on Voca! 💬`,
                type: 'text',
                status: 'delivered',
                timestamp: new Date()
            });

            // Update chat with last message
            chat.lastMessage = welcomeMessage._id;
            chat.lastMessageTime = welcomeMessage.timestamp;
            await chat.save();
        }

        res.status(201).json({
            user: user.toJSON(),
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup', error: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if user is banned
        if (user.isBanned) {
            return res.status(403).json({ message: 'Your account has been banned' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Update status to online
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();

        res.json({
            user: user.toJSON(),
            token: generateToken(user._id),
            isAdminPanel: user.isAdminPanel || false
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
});

// @route   POST /api/auth/google
// @desc    Login/Register with Google
// @access  Public
router.post('/google', async (req, res) => {
    try {
        let { googleId, email, name, avatar } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required from Google' });
        }

        // Upload Google avatar to Cloudinary if verified
        if (avatar) {
            try {
                // Check if it's already a Cloudinary URL to avoid re-uploading on repeated logins if logic changes
                if (!avatar.includes('cloudinary.com')) {
                    const result = await cloudinary.uploader.upload(avatar, {
                        folder: 'Voca/profiles',
                        resource_type: 'image'
                    });
                    avatar = result.secure_url;
                }
            } catch (uploadError) {
                console.error('Failed to upload Google avatar to Cloudinary:', uploadError);
                // Fallback to original Google URL if upload fails
            }
        }

        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            if (user.isBanned) return res.status(403).json({ message: 'Your account has been banned' });

            if (!user.googleId) {
                user.googleId = googleId;
                // Update avatar only if user doesn't have one or if we have a new one (optional policy, usually we keep existing if user changed it)
                // But for Google sync, often we might want to sync. 
                // User requirement: "user profiles also uploaded".
                // Logic: If user has no avatar, OR if we want to sync. 
                // Existing logic was: if (!user.avatar && avatar) user.avatar = avatar;
                // I will keep existing logic but with the new Cloudinary URL.
                if (!user.avatar && avatar) user.avatar = avatar;
                await user.save();
            }

            // ... rest of logic
            user.status = 'online';
            user.lastSeen = new Date();
            await user.save();

            return res.json({
                user: user.toJSON(),
                token: generateToken(user._id),
                isAdminPanel: user.isAdminPanel || false
            });
        }

        user = await User.create({
            name,
            email: email.toLowerCase(),
            authProvider: 'google',
            googleId,
            avatar: avatar || '',
            password: 'google-auth-no-password-' + Math.random().toString(36).slice(-8),
            joinedAt: new Date(),
            verified: true
        });

        const vocaTeam = await User.findOne({ isVocaTeam: true });
        if (vocaTeam) {
            const chat = await Chat.create({
                participants: [vocaTeam._id, user._id],
                isGroup: false,
                unreadCount: new Map([[user._id.toString(), 1]])
            });
            const welcomeMessage = await Message.create({
                chatId: chat._id,
                senderId: vocaTeam._id,
                content: `👋 Welcome to Voca, ${name}!\n\nWe're thrilled to have you here! \n\n✨ Tips to get started:\n• Complete your profile\n• Explore and connect\n\nEnjoy your Voca journey! 💬`,
                type: 'text',
                status: 'delivered',
                timestamp: new Date()
            });
            chat.lastMessage = welcomeMessage._id;
            chat.lastMessageTime = welcomeMessage.timestamp;
            await chat.save();
        }

        res.status(201).json({
            user: user.toJSON(),
            token: generateToken(user._id),
            isAdminPanel: false
        });

    } catch (error) {
        console.error('Google Auth error:', error);
        res.status(500).json({ message: 'Server error during Google login', error: error.message });
    }
});

// @route   POST /api/auth/admin-login
// @desc    Admin panel login (separate from user login)
// @access  Public
router.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin user
        const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
        if (!user) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        // Only allow admin panel accounts for this endpoint
        if (!user.isAdminPanel) {
            return res.status(403).json({ message: 'This account is not authorized for admin panel access. Use admin@voca.com' });
        }

        res.json({
            user: user.toJSON(),
            token: generateToken(user._id),
            isAdminPanel: true
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error during admin login', error: error.message });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (user) {
                user.status = 'offline';
                user.lastSeen = new Date();
                await user.save();
            }
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.json({ message: 'Logged out' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id)
            .populate('favorites', 'name avatar status')
            .populate('blockedUsers', 'name avatar');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.toJSON());
    } catch (error) {
        res.status(401).json({ message: 'Token invalid' });
    }
});

export default router;
