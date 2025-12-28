import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    type: {
        type: String,
        enum: ['text', 'image', 'voice', 'video', 'doc'],
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
    isStarred: { type: Boolean, default: false },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Transform for JSON output
messageSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.chatId = ret.chatId?.toString();
        ret.senderId = ret.senderId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
