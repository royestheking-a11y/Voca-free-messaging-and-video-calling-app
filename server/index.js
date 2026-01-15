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
import adsRoutes from './routes/ads.js';

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
    res.status(200).send('OK');
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
app.use('/api/ads', adsRoutes);

// Web Push (Legacy/Desktop)
import webpush from 'web-push';

// Firebase Admin (Mobile VoIP/Push)
import admin from 'firebase-admin';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Production: Parse from Environment Variable
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✅ Firebase Service Account loaded from Environment Variable');
    } else {
        // Local: Load from file
        serviceAccount = require("./serviceAccountKey.json");
        console.log('✅ Firebase Service Account loaded from local file');
    }
} catch (error) {
    console.error('⚠️ Could not load Firebase Service Account. Mobile Push will not work.', error.message);
}

if (serviceAccount && !admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized');
    } catch (error) {
        console.error('❌ Firebase Init Error:', error);
    }
}

// ... existing webpush config ...

const publicVapidKey = 'BHgNtaH95BRApkIjFwoE1YuKCrFIYPlwHohRYjr8Q-xdhwpcrTH_NTT4TcHISgB7EGjKkI54ZyPogiuiRrnuhTc';
const privateVapidKey = 'd1RQMcUyf25CpItxXGNICU7fzjgb1GMG3jADYALUR5s';

webpush.setVapidDetails(
    'mailto:admin@voca.app',
    publicVapidKey,
    privateVapidKey
);

// VoIP Push Helper
const sendVoIPPush = async (token, title, body, data) => {
    try {
        const message = {
            token: token,
            notification: {
                title: title,
                body: body,
            },
            data: {
                ...data,
                click_action: "FLUTTER_NOTIFICATION_CLICK" // Standard handler
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'high',
                    channelId: 'calls' // Important for Android 8+
                }
            }
        };
        await admin.messaging().send(message);
        console.log(`📞 FCM/VoIP Push sent to ${token.substring(0, 10)}...`);
    } catch (error) {
        console.error('Error sending VoIP push:', error);
    }
};

// ... routes ...

// Socket.IO
const onlineUsers = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on('user:online', async (userData) => {
        const { userId, name, avatar, fcmToken } = userData; // Receive FCM Token

        // Update user in DB with FCM token if provided
        if (fcmToken) {
            try {
                await User.findByIdAndUpdate(userId, {
                    status: 'online',
                    lastSeen: new Date(),
                    fcmToken: fcmToken
                });
                console.log(`💾 FCM Token saved for user ${name}`);
            } catch (error) {
                console.error('Error saving FCM token:', error);
            }
        } else {
            await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
        }

        onlineUsers.set(userId, {
            id: userId, name, avatar,
            lastSeen: new Date().toISOString(),
            socketId: socket.id,
            status: 'online',
            fcmToken: fcmToken // Store in memory too
        });

        userSockets.set(userId, socket.id);
        socket.userId = userId;

        // Notify all connected users
        io.emit('user:online', {
            userId,
            status: 'online',
            lastSeen: new Date().toISOString()
        });

        const onlineList = Array.from(onlineUsers.values()).map(u => ({
            userId: u.id, status: 'online', lastSeen: u.lastSeen
        }));
        socket.emit('users:online-list', onlineList);
    });

    socket.on('message:send', async (data) => {
        const { recipientId, chatId, message } = data;
        const recipientSocketId = userSockets.get(recipientId);

        // Socket handler ONLY relays messages - saving is done by API endpoint
        // (Client calls POST /api/chats/:id/messages which saves to DB)
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('message:receive', { chatId, message: { ...message, status: 'delivered' } });
            socket.emit('message:delivered', { messageId: message.id, chatId });
        }

        // Always send push notification (ensures locked devices/background get it)
        try {
            const recipient = await User.findById(recipientId);
            const sender = await User.findById(socket.userId).select('name avatar');

            // 1. Try FCM (Mobile App) first
            if (recipient?.fcmToken) {
                const msgBody = (() => {
                    switch (message.type) {
                        case 'image': return '📷 Photo';
                        case 'video': return '🎥 Video';
                        case 'audio': return '🎵 Audio';
                        case 'voice': return '🎤 Voice Message';
                        case 'doc': return '📄 Document';
                        case 'poll': return '📊 Poll';
                        case 'event': return '📅 Event';
                        case 'contact': return '👤 Contact';
                        case 'location': return '📍 Location';
                        default: return message.content || 'New Message';
                    }
                })();

                await sendVoIPPush(
                    recipient.fcmToken,
                    sender?.name || 'Voca User',
                    msgBody,
                    {
                        type: 'message',
                        chatId: chatId,
                        url: `/chat/${chatId}`
                    }
                );
            }

            // 2. Try Web Push (Desktop/PWA) as backup or parallel
            if (recipient?.pushSubscription && recipient.pushSubscription.endpoint) {
                const payload = JSON.stringify({
                    title: sender?.name || 'Voca User',
                    body: (() => {
                        switch (message.type) {
                            case 'image': return '📷 Photo';
                            case 'video': return '🎥 Video';
                            case 'audio': return '🎵 Audio';
                            case 'voice': return '🎤 Voice Message';
                            case 'doc': return '📄 Document';
                            case 'poll': return '📊 Poll';
                            case 'event': return '📅 Event';
                            case 'contact': return '👤 Contact';
                            case 'location': return '📍 Location';
                            default: return message.content || 'New Message';
                        }
                    })(),
                    icon: sender?.avatar || '/pwa-192x192.png',
                    tag: `chat-${chatId}`, // Group messages from same chat
                    renotify: true,
                    data: { url: `/chat/${chatId}`, type: 'message' }
                });

                console.log(`📲 Sending push to ${recipient.name} (${recipient._id})`);
                console.log(`📬 Endpoint: ${recipient.pushSubscription.endpoint}`);
                webpush.sendNotification(recipient.pushSubscription, payload)
                    .then(() => console.log(`✅ Push sent to ${recipient.name}`))
                    .catch(err => {
                        console.error('Push Error:', err);
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            // Subscription is invalid/expired, remove it
                            console.log(`🗑️ Removing invalid subscription for ${recipient.name}`);
                            User.findByIdAndUpdate(recipientId, { $unset: { pushSubscription: 1 } }).catch(e => console.error(e));
                        }
                    });
            } else {
                console.log(`⚠️ No push subscription for ${recipient?.name || recipientId}`);
            }
        } catch (err) {
            console.error('Error sending push:', err);
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

    // Real-time message update events
    socket.on('message:delete', ({ chatId, messageId, recipientId, forEveryone }) => {
        const recipientSocketId = userSockets.get(recipientId);
        if (recipientSocketId && forEveryone) {
            io.to(recipientSocketId).emit('message:deleted', { chatId, messageId });
        }
    });

    socket.on('message:edit', ({ chatId, messageId, recipientId, newContent }) => {
        const recipientSocketId = userSockets.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('message:edited', { chatId, messageId, newContent });
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

        // Send FCM (Mobile) Push if user has updated token
        try {
            const recipient = await User.findById(to);
            const sender = await User.findById(socket.userId).select('name avatar');

            if (recipient?.fcmToken) {
                const isVideo = callType === 'video';
                await sendVoIPPush(
                    recipient.fcmToken,
                    `Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
                    `${sender?.name || 'Voca User'} is calling...`,
                    {
                        type: 'call',
                        callType: callType,
                        callerId: socket.userId,
                        callerName: sender?.name
                    }
                );
            }
        } catch (fcmErr) {
            console.error('FCM Error:', fcmErr);
        }

        // Always attempt to send Push Notification for calls (ensures locked devices get it)
        try {
            const recipient = await User.findById(to);
            const sender = await User.findById(socket.userId).select('name avatar'); // Re-fetch to be safe or use 'caller'

            if (recipient?.pushSubscription && recipient.pushSubscription.endpoint) {
                // ... (Keep existing WebPush logic as backup/desktop)
                const isVideo = callType === 'video';
                const payload = JSON.stringify({
                    title: `Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
                    body: `${sender?.name || 'Someone'} is calling you...`,
                    icon: sender?.avatar || '/pwa-192x192.png',
                    tag: 'call', // Replaces older call notifications
                    renotify: true,
                    requireInteraction: true, // Keep on screen until user responds
                    data: {
                        url: '/chat', // Navigate to chat list - GlobalCallUI will show incoming call
                        type: 'call',
                        callType,
                        callerId: socket.userId
                    },
                    actions: [
                        { action: 'answer', title: 'Answer', icon: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' }, // Green Phone
                        { action: 'decline', title: 'Decline', icon: 'https://cdn-icons-png.flaticon.com/512/1632/1632602.png' } // Red Phone Hanging
                    ]
                });

                console.log(`📲 Sending push to ${recipient.name} (${recipient._id})`);
                console.log(`📬 Endpoint: ${recipient.pushSubscription.endpoint}`);
                webpush.sendNotification(recipient.pushSubscription, payload)
                    .then(() => console.log(`✅ Call push sent to ${recipient.name}`))
                    .catch(err => {
                        console.error('Call Push Error:', err);
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            console.log(`🗑️ Removing invalid subscription for ${recipient.name}`);
                            User.findByIdAndUpdate(recipient.id, { $unset: { pushSubscription: 1 } }).catch(e => console.error(e));
                        }
                    });
            } else {
                console.log(`⚠️ No push subscription for ${to}`);
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

            // Offline push notifications disabled for privacy
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
                avatar: 'https://res.cloudinary.com/dfvc27xla/image/upload/v1766864808/voca/profiles/voca-team-avatar.png',
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
                avatar: 'https://res.cloudinary.com/dfvc27xla/image/upload/v1766864808/voca/profiles/voca-team-avatar.png',
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
        // Start HTTP server FIRST so health checks pass immediately
        httpServer.listen(PORT, () => {
            console.log(`
  🚀 Voca Server Running
  ======================
  Port: ${PORT}
  Socket.IO: Ready
  Health Check: http://localhost:${PORT}/health
      `);
        });

        // Then attempt DB connection (non-blocking for server start)
        try {
            await connectDB();
            await seedData();
            console.log('✅ Database connected and seeded');
        } catch (dbError) {
            console.error('⚠️ Database connection failed (Server still running for health checks):', dbError.message);
        }

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
