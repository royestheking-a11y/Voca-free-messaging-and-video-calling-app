import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    type: {
        type: String,
        enum: ['text', 'image', 'voice', 'video', 'doc', 'call', 'poll', 'event', 'audio', 'contact', 'location'],
        default: 'text'
    },
    mediaUrl: { type: String }, // Cloudinary URL for media
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read'],
        default: 'sent'
    },
    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of users who starred this message
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Transform for JSON output
messageSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.chatId = ret.chatId?.toString();
        ret.senderId = ret.senderId?.toString();
        if (ret.starredBy) {
            ret.starredBy = ret.starredBy.map(id => id.toString());
        } else {
            ret.starredBy = [];
        }
        // Convert replyTo ObjectId to replyToId string for frontend
        if (ret.replyTo) {
            ret.replyToId = ret.replyTo.toString();
            delete ret.replyTo;
        }
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
