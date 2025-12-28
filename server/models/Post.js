import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: true });

const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    imageUrl: { type: String }, // Cloudinary URL
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    shares: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Transform for JSON output
postSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // Keep userId as object if populated, otherwise convert to string
        if (ret.userId && typeof ret.userId !== 'object') {
            ret.userId = ret.userId.toString();
        }
        // Keep user field if it exists (populated as 'user')
        ret.user = ret.userId;
        ret.likes = ret.likes?.map(id => typeof id === 'object' ? id : id.toString());
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Post = mongoose.model('Post', postSchema);
export default Post;
