import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
    callerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['voice', 'video'], required: true },
    status: {
        type: String,
        enum: ['missed', 'received', 'outgoing'],
        default: 'outgoing'
    },
    duration: { type: Number, default: 0 }, // In seconds
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Transform for JSON output
callSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.callerId = ret.callerId?.toString();
        ret.receiverId = ret.receiverId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Call = mongoose.model('Call', callSchema);
export default Call;
