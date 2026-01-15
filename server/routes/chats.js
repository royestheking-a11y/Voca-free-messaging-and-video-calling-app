import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/chats
// @desc    Get all chats for current user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: req.user._id
        })
            .populate('participants', 'name avatar status lastSeen isVocaTeam verified')
            .populate({
                path: 'lastMessage',
                select: 'content type timestamp senderId status'
            })
            .sort({ lastMessageTime: -1 });

        // Get messages for each chat
        const chatsWithMessages = await Promise.all(
            chats.map(async (chat) => {
                console.log(`🔍 Fetching messages for Chat ID: ${chat._id} (type: ${typeof chat._id})`);
                const messages = await Message.find({ chatId: chat._id })
                    .sort({ timestamp: -1 })  // NEWEST first (fix for disappearing messages)
                    .limit(100);

                console.log(`📊 Found ${messages.length} messages for chat ${chat._id}`);

                const chatObj = chat.toJSON();
                // Reverse to display oldest-to-newest in UI
                chatObj.messages = messages.reverse().map(m => m.toJSON());
                chatObj.unreadCount = chatObj.unreadCount?.[req.user._id.toString()] || 0;
                return chatObj;
            })
        );

        console.log(`✅ Returning ${chatsWithMessages.length} chats to user ${req.user._id}`);

        res.json(chatsWithMessages);
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/chats
// @desc    Create a new chat
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { participantId, isGroup, name, groupImage, participantIds } = req.body;

        if (isGroup) {
            // Create group chat
            const chat = await Chat.create({
                participants: [req.user._id, ...participantIds],
                isGroup: true,
                name,
                groupImage
            });

            const populatedChat = await Chat.findById(chat._id)
                .populate('participants', 'name avatar status lastSeen');

            res.status(201).json(populatedChat);
        } else {
            // Check if chat already exists
            const existingChat = await Chat.findOne({
                isGroup: false,
                participants: { $all: [req.user._id, participantId], $size: 2 }
            }).populate('participants', 'name avatar status lastSeen isVocaTeam verified');

            if (existingChat) {
                const messages = await Message.find({ chatId: existingChat._id }).sort({ timestamp: 1 });
                const chatObj = existingChat.toJSON();
                chatObj.messages = messages.map(m => m.toJSON());
                return res.json(chatObj);
            }

            // Create new chat
            const chat = await Chat.create({
                participants: [req.user._id, participantId],
                isGroup: false
            });

            const populatedChat = await Chat.findById(chat._id)
                .populate('participants', 'name avatar status lastSeen isVocaTeam verified');

            res.status(201).json({ ...populatedChat.toJSON(), messages: [] });
        }
    } catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/chats/:id/messages
// @desc    Get messages for a chat
// @access  Private
router.get('/:id/messages', protect, async (req, res) => {
    try {
        const { limit = 50, before } = req.query;

        const query = { chatId: req.params.id };
        if (before) {
            query.timestamp = { $lt: new Date(before) };
        }

        console.log(`🔍 Fetching messages for Chat: ${req.params.id}`);
        // Log the query to be sure
        console.log('Query:', JSON.stringify(query));

        const messages = await Message.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/chats/:id/messages
// @desc    Send a message
// @access  Private
router.post('/:id/messages', protect, async (req, res) => {
    try {
        const { content, type, mediaUrl, replyToId } = req.body;
        const chatId = req.params.id;

        const message = await Message.create({
            chatId: new mongoose.Types.ObjectId(chatId), // Convert string to ObjectId
            senderId: req.user._id,
            content,
            type: type || 'text',
            mediaUrl,
            replyTo: replyToId ? new mongoose.Types.ObjectId(replyToId) : undefined, // Link reply
            status: 'sent',
            timestamp: new Date()
        });

        // Get the chat to find other participants
        const chat = await Chat.findById(chatId);

        // Update unreadCount for all participants except sender
        const unreadUpdate = {};
        chat.participants.forEach(participantId => {
            if (participantId.toString() !== req.user._id.toString()) {
                const currentCount = chat.unreadCount?.get(participantId.toString()) || 0;
                unreadUpdate[`unreadCount.${participantId.toString()}`] = currentCount + 1;
            }
        });

        // Update chat's last message and unread counts
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: message._id,
            lastMessageTime: message.timestamp,
            ...unreadUpdate
        });

        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/chats/:id/read
// @desc    Mark chat as read (reset unread count)
// @access  Private
router.post('/:id/read', protect, async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.user._id.toString();

        // Reset unread count for current user
        await Chat.findByIdAndUpdate(chatId, {
            [`unreadCount.${userId}`]: 0
        });

        // Mark all messages in this chat as read by this user
        await Message.updateMany(
            {
                chatId,
                senderId: { $ne: req.user._id },
                status: { $ne: 'read' }
            },
            { status: 'read' }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/chats/:chatId/messages/:msgId
// @desc    Delete a message
// @access  Private
router.delete('/:chatId/messages/:msgId', protect, async (req, res) => {
    try {
        const { forEveryone } = req.query;

        if (forEveryone === 'true') {
            await Message.findByIdAndUpdate(req.params.msgId, {
                isDeleted: true,
                content: 'This message was deleted'
            });
        } else {
            // Soft delete for current user only (would need a deletedFor array)
            await Message.findByIdAndUpdate(req.params.msgId, {
                isDeleted: true
            });
        }

        res.json({ message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/chats/:chatId/messages/:msgId
// @desc    Edit a message
// @access  Private
router.put('/:chatId/messages/:msgId', protect, async (req, res) => {
    try {
        const { content } = req.body;

        const message = await Message.findOneAndUpdate(
            { _id: req.params.msgId, senderId: req.user._id },
            { content, isEdited: true },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ message: 'Message not found or not authorized' });
        }

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/chats/:id/archive
// @desc    Toggle archive chat
// @access  Private
router.post('/:id/archive', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const chatId = req.params.id;

        if (user.archivedChats?.includes(chatId)) {
            user.archivedChats = user.archivedChats.filter(id => id.toString() !== chatId);
        } else {
            user.archivedChats = [...(user.archivedChats || []), chatId];
        }

        await user.save();
        res.json({ archived: user.archivedChats.includes(chatId) });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/chats/:id
// @desc    Delete a chat
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        // Delete all messages in the chat
        await Message.deleteMany({ chatId: req.params.id });

        // Delete the chat
        await Chat.findByIdAndDelete(req.params.id);

        res.json({ message: 'Chat deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/chats/:chatId/messages/:messageId/star
// @desc    Toggle star status of a message for the user
// @access  Private
router.put('/:chatId/messages/:messageId/star', protect, async (req, res) => {
    try {
        const { messageId } = req.params;
        const msg = await Message.findById(messageId);

        if (!msg) {
            return res.status(404).json({ message: 'Message not found' });
        }

        const userId = req.user._id;
        const isStarred = msg.starredBy.includes(userId);

        if (isStarred) {
            // Unstar
            await Message.findByIdAndUpdate(messageId, {
                $pull: { starredBy: userId }
            });
        } else {
            // Star
            await Message.findByIdAndUpdate(messageId, {
                $addToSet: { starredBy: userId }
            });
        }

        const updatedMsg = await Message.findById(messageId);
        res.json(updatedMsg);

    } catch (err) {
        console.error('Error in star message:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/chats/:chatId/messages/:messageId/poll
// @desc    Vote on a poll
// @access  Private
router.put('/:chatId/messages/:messageId/poll', protect, async (req, res) => {
    try {
        const { optionId } = req.body;
        const { messageId } = req.params;
        const userId = req.user._id.toString();

        const message = await Message.findById(messageId);
        if (!message || message.type !== 'poll') {
            return res.status(404).json({ message: 'Poll not found' });
        }

        let pollData;
        try {
            pollData = JSON.parse(message.content);
        } catch (e) {
            return res.status(500).json({ message: 'Invalid poll data' });
        }

        const optionIndex = pollData.options.findIndex(o => o.id === optionId);
        if (optionIndex === -1) {
            return res.status(400).json({ message: 'Option not found' });
        }

        const option = pollData.options[optionIndex];
        const hasVoted = option.voterIds.includes(userId);

        if (hasVoted) {
            // Remove vote
            option.voterIds = option.voterIds.filter(id => id !== userId);
        } else {
            // Add vote
            if (!pollData.allowMultiple) {
                // Remove from others if single choice
                pollData.options.forEach(opt => {
                    opt.voterIds = opt.voterIds.filter(id => id !== userId);
                });
            }
            option.voterIds.push(userId);
        }

        // Update message content
        message.content = JSON.stringify(pollData);
        await message.save();

        // Emit socket event for real-time update
        const io = req.app.get('io');
        const chat = await Chat.findById(message.chatId);

        chat.participants.forEach(participantId => {
            // Emit to all participants
            // We use a generic 'message:updated' event which the client should listen for
            // Or specifically reuse 'message:edited'
            const socketId = req.app.get('io').sockets.adapter.rooms.get(participantId.toString()) || null;
            // Note: In our setup we track sockets manually in `userSockets` map in index.js
            // Since we don't have direct access to that map here easily without exporting it,
            // we will rely on the client broadcasting OR we can just return the message and let the client
            // emit the socket event like we do for other things (temporary pattern match).
            // However, for ROBUSTNESS, the server *should* emit.
            // Given existing pattern in `index.js`, socket logic is centralized there.
            // We will return the updated message and let the client emit 'message:edit' via socket 
            // to keep consistent with the current "client-heavy" socket architecture.
        });

        res.json(message);

    } catch (error) {
        console.error('Poll vote error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
