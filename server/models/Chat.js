import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    isGroup: { type: Boolean, default: false },
    name: { type: String }, // For group chats
    groupImage: { type: String }, // Cloudinary URL for group image
    unreadCount: { type: Map, of: Number, default: {} }, // Map of odId -> unread count
    pinned: { type: Boolean, default: false },
    muted: { type: Boolean, default: false },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageTime: { type: Date, default: Date.now }
}, { timestamps: true });

// Transform for JSON output
chatSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

// Virtual to get messages
chatSchema.virtual('messages', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'chatId'
});

chatSchema.set('toObject', { virtuals: true });
chatSchema.set('toJSON', { virtuals: true });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
