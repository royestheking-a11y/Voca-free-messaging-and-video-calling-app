import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, required: true }, // Cloudinary URL
    mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'image' },
    caption: { type: String, default: '' },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    timestamp: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24 hours
}, { timestamps: true });

// Transform for JSON output
statusSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // Keep userId as object if populated, otherwise convert to string
        if (ret.userId && typeof ret.userId !== 'object') {
            ret.userId = ret.userId.toString();
        }
        // Keep user field if it exists (populated as 'user')
        ret.user = ret.userId;
        ret.viewers = ret.viewers?.map(id => typeof id === 'object' ? id : id.toString());
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

// Index for auto-deletion of expired statuses
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Status = mongoose.model('Status', statusSchema);
export default Status;
