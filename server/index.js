import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import connectDB from './config/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chats.js';
import uploadRoutes from './routes/upload.js';
import postRoutes from './routes/posts.js';
import statusRoutes from './routes/statuses.js';
import callsRoutes from './routes/calls.js';
import callsDebugRoutes from './routes/calls_debug.js';
import adminRoutes from './routes/admin.js';

import User from './models/User.js';
import Chat from './models/Chat.js';
import Message from './models/Message.js';
import Advertisement from './models/Advertisement.js';
import SystemSettings from './models/SystemSettings.js';
// ...

dotenv.config();
// connectDB(); // Called in startServer

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            // For development, you might want to allow all or log warning
            // return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
            return callback(null, true); // Temporarily allow all for easier dev/deploy debugging
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Make io accessible in routes
app.set('io', io);

// Health check endpoint for cron-job (keeps Render awake)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/calls', callsDebugRoutes); // Debug route must be before general calls route
app.use('/api/calls', callsRoutes);
app.use('/api/admin', adminRoutes);

// Web Push
import webpush from 'web-push';

const publicVapidKey = 'BHgNtaH95BRApkIjFwoE1YuKCrFIYPlwHohRYjr8Q-xdhwpcrTH_NTT4TcHISgB7EGjKkI54ZyPogiuiRrnuhTc';
const privateVapidKey = 'd1RQMcUyf25CpItxXGNICU7fzjgb1GMG3jADYALUR5s';

webpush.setVapidDetails(
    'mailto:support@voca.app',
    publicVapidKey,
    privateVapidKey
);

// Subscribe Route
app.post('/api/notifications/subscribe', async (req, res) => {
    const subscription = req.body;
    // In a real app, you would get userId from auth middleware
    // For now, we assume the client sends userId or we rely on socket mapping
    // But better to just save it if we have headers.
    // Let's assume the client is authenticated and we can use a simple way or update via User route.
    // actually, let's make this simple:
    res.status(201).json({});
});

// We should probably add this to user routes or a new notification route file properly.
// For speed, let's handle subscription update in the socket connection or a dedicated simple route that updates the user.

import notificationRoutes from './routes/notifications.js';
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO for real-time features
const onlineUsers = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on('user:online', async (userData) => {
        const { userId, name, avatar } = userData;

        onlineUsers.set(userId, {
            id: userId, name, avatar,
            lastSeen: new Date().toISOString(),
            socketId: socket.id,
            status: 'online'
        });

        userSockets.set(userId, socket.id);
        socket.userId = userId;

        // Update user status in database
        try {
            await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
        } catch (error) {
            console.error('Error updating user status:', error);
        }

        // Notify all connected users
        io.emit('user:online', {
            userId,
            status: 'online',
            lastSeen: new Date().toISOString()
        });

        // Send push notification to all users (contacts)
        try {
            // Find all users who have this user in their chats (contacts)
            const users = await User.find({
                pushSubscription: { $exists: true, $ne: null }
            }).select('_id pushSubscription');

            for (const user of users) {
                if (user.pushSubscription?.endpoint && user._id.toString() !== userId) {
                    const payload = JSON.stringify({
                        title: `${name} is now online`,
                        body: 'Tap to start chatting',
                        icon: avatar || 'https://voca-web-app.vercel.app/pwa-192x192.png',
                        data: { url: `/chat/${userId}` }
                    });

                    webpush.sendNotification(user.pushSubscription, payload).catch(err => {
                        console.error('Push Error (online notification):', err);
                    });
                }
            }
        } catch (err) {
            console.error('Error sending online notifications:', err);
        }

        const onlineList = Array.from(onlineUsers.values()).map(u => ({
            userId: u.id, status: 'online', lastSeen: u.lastSeen
        }));
        socket.emit('users:online-list', onlineList);
    });

    socket.on('message:send', async (data) => {
        const { recipientId, chatId, message } = data;
        const recipientSocketId = userSockets.get(recipientId);

        if (recipientSocketId) {
            io.to(recipientSocketId).emit('message:receive', { chatId, message: { ...message, status: 'delivered' } });
            socket.emit('message:delivered', { messageId: message.id, chatId });
        } else {
            // User is offline or not connected, send Push Notification
            try {
                const recipient = await User.findById(recipientId);
                // Fetch sender details for accurate name and avatar
                const sender = await User.findById(socket.userId).select('name avatar');

                if (recipient?.pushSubscription && recipient.pushSubscription.endpoint) {
                    const payload = JSON.stringify({
                        title: `New Message from ${sender?.name || 'Voca User'}`,
                        body: message.type === 'image' ? 'Sent a photo 📷' : message.content,
                        icon: sender?.avatar || 'https://voca-web-app.vercel.app/pwa-192x192.png',
                        data: { url: `/chat/${chatId}` }
                    });

                    webpush.sendNotification(recipient.pushSubscription, payload).catch(err => {
                        console.error('Push Error:', err);
                        // If 410 or 404, remove subscription
                    });
                }
            } catch (err) {
                console.error('Error sending push:', err);
            }
        }
    });

    socket.on('typing:start', ({ chatId, recipientId }) => {
        const recipientSocketId = userSockets.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('typing:show', { chatId, userId: socket.userId });
        }
    });

    socket.on('message:read', async ({ chatId, messageId, senderId }) => {
        // Update status in database
        try {
            await Message.findByIdAndUpdate(messageId, { status: 'read' });
        } catch (error) {
            console.error('Error updating message read status:', error);
        }

        const senderSocketId = userSockets.get(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit('message:read', { messageId, chatId });
        }
    });

    socket.on('typing:stop', ({ chatId, recipientId }) => {
        const recipientSocketId = userSockets.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('typing:hide', { chatId, userId: socket.userId });
        }
    });

    // WebRTC Signaling Events
    // WebRTC Signaling Events
    socket.on('call:offer', async ({ to, from, offer, callType }) => {
        const recipientSocketId = userSockets.get(to);
        const caller = onlineUsers.get(socket.userId);

        if (recipientSocketId) {
            // Send caller's USER ID (not socket ID) so receiver can find them
            io.to(recipientSocketId).emit('call:incoming', {
                from: socket.userId,  // Use caller's user ID
                offer,
                callType,
                caller: caller  // Look up by user ID
            });
        }

        // Always attempt to send Push Notification for calls (ensures locked devices get it)
        try {
            const recipient = await User.findById(to);
            const sender = await User.findById(socket.userId).select('name avatar'); // Re-fetch to be safe or use 'caller'

            if (recipient?.pushSubscription && recipient.pushSubscription.endpoint) {
                const isVideo = callType === 'video';
                const payload = JSON.stringify({
                    title: `Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
                    body: `${sender?.name || 'Someone'} is calling you...`,
                    icon: sender?.avatar || 'https://voca-web-app.vercel.app/pwa-192x192.png',
                    tag: 'call', // Replaces older call notifications
                    renotify: true,
                    data: {
                        url: `/chat/${from}?call=true`, // Or specific call route
                        type: 'call',
                        callType
                    },
                    actions: [
                        { action: 'answer', title: 'Answer ✅' },
                        { action: 'decline', title: 'Decline ❌' }
                    ]
                });

                webpush.sendNotification(recipient.pushSubscription, payload).catch(err => {
                    console.error('Push Error (Call):', err);
                });
            }
        } catch (err) {
            console.error('Error sending call push:', err);
        }
    });

    socket.on('call:answer', ({ to, answer }) => {
        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call:answered', { answer });
        }
    });

    socket.on('call:ice-candidate', ({ to, candidate }) => {
        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call:ice-candidate', { candidate });
        }
    });

    socket.on('call:reject', ({ to }) => {
        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call:rejected');
        }
    });

    // End call
    socket.on('call:end', (data) => {
        console.log('📞 Forwarding call:end to', data.to, 'with data:', { duration: data.duration, status: data.status });
        const recipientSocketId = userSockets.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call:ended', {
                duration: data.duration,
                status: data.status
            });
        }
    });

    socket.on('call:busy', ({ to }) => {
        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call:busy');
        }
    });

    socket.on('disconnect', async () => {
        const userId = socket.userId;
        if (userId) {
            const userInfo = onlineUsers.get(userId);
            const userName = userInfo?.name || 'A user';

            onlineUsers.delete(userId);
            userSockets.delete(userId);

            // Update database status
            try {
                await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
            } catch (error) {
                console.error('Error updating user status on disconnect:', error);
            }

            io.emit('user:offline', { userId, lastSeen: new Date().toISOString() });

            // Send offline notification to all users (contacts)
            try {
                const users = await User.find({
                    pushSubscription: { $exists: true, $ne: null }
                }).select('_id pushSubscription');

                for (const user of users) {
                    if (user.pushSubscription?.endpoint && user._id.toString() !== userId) {
                        const payload = JSON.stringify({
                            title: `${userName} went offline`,
                            body: 'They are no longer available',
                            icon: 'https://voca-web-app.vercel.app/pwa-192x192.png',
                            data: { url: `/chat/${userId}` }
                        });

                        webpush.sendNotification(user.pushSubscription, payload).catch(err => {
                            console.error('Push Error (offline notification):', err);
                        });
                    }
                }
            } catch (err) {
                console.error('Error sending offline notifications:', err);
            }
        }

        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

// Seed initial data
const seedData = async () => {
    try {
        // Check if admin panel account exists
        const adminPanelExists = await User.findOne({ email: 'admin@voca.com' });
        if (!adminPanelExists) {
            console.log('📦 Seeding initial data...');

            // Create Admin Panel account (for admin dashboard access only)
            await User.create({
                name: 'Admin Panel',
                email: 'admin@voca.com',
                password: 'voca@878',
                role: 'admin',
                isAdminPanel: true, // Special flag for admin panel only
                verified: true,
                status: 'online',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
                about: 'Admin Panel Access',
                joinedAt: new Date()
            });

            // Create Admin User account (regular user experience with admin privileges)
            await User.create({
                name: 'Admin User',
                email: 'admin@voca.app',
                password: 'admin878',
                role: 'admin',
                verified: true,
                status: 'online',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
                about: 'System Administrator',
                joinedAt: new Date()
            });

            // Create Voca Team user
            await User.create({
                name: 'Voca Team',
                email: 'team@voca.com',
                password: 'vocateam123',
                role: 'admin',
                isVocaTeam: true,
                verified: true,
                status: 'online',
                avatar: 'https://res.cloudinary.com/dfvc27xla/image/upload/v1766864808/voca/profiles/voca-team-avatar.png',
                about: 'Official Voca Team - Announcements & Updates',
                joinedAt: new Date()
            });

            // Create test users
            const testUsers = [
                { name: 'Alice Chen', email: 'alice@example.com', password: 'password123', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop', about: 'Design is intelligence made visible.', verified: true },
                { name: 'Bob Miller', email: 'bob@example.com', password: 'password123', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop', about: 'Available for freelance work.', verified: true },
                { name: 'Charlie Kim', email: 'charlie@example.com', password: 'password123', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop', about: 'At the gym 🏋️', verified: false }
            ];

            for (const userData of testUsers) {
                await User.create({ ...userData, joinedAt: new Date() });
            }

            // Create sample advertisements
            await Advertisement.create([
                { title: 'Premium Voca', content: 'Upgrade to Voca Premium for unlimited features.', position: 'chat_list', active: true },
                { title: 'Tech Conference 2025', content: 'Join the biggest tech event of the year.', position: 'landing_page', active: true }
            ]);

            // Initialize system settings
            await SystemSettings.getSettings();

            console.log('✅ Initial data seeded successfully');
        }
    } catch (error) {
        console.error('❌ Error seeding data:', error);
    }
};

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        await connectDB();
        await seedData();

        httpServer.listen(PORT, () => {
            console.log(`
  🚀 Voca Server Running
  ======================
  Port: ${PORT}
  MongoDB: Connected
  Cloudinary: Configured
  Socket.IO: Ready
  
  API Endpoints:
  - POST   /api/auth/signup
  - POST   /api/auth/login
  - GET    /api/users
  - GET    /api/chats
  - POST   /api/upload/image
  - GET    /api/posts
  - GET    /api/admin/stats
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
