import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportedContentId: { type: mongoose.Schema.Types.ObjectId }, // Can be a message, post, etc.
    reason: { type: String, required: true },
    details: { type: String },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'dismissed'],
        default: 'pending'
    },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Transform for JSON output
reportSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.reporterId = ret.reporterId?.toString();
        ret.reportedUserId = ret.reportedUserId?.toString();
        ret.reportedContentId = ret.reportedContentId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
