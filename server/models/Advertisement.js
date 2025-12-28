import mongoose from 'mongoose';

const advertisementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String }, // Cloudinary URL
    position: {
        type: String,
        enum: ['landing_page', 'chat_list', 'sidebar'],
        default: 'sidebar'
    },
    active: { type: Boolean, default: true },
    link: { type: String, default: '#' },
    clicks: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
}, { timestamps: true });

// Transform for JSON output
advertisementSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Advertisement = mongoose.model('Advertisement', advertisementSchema);
export default Advertisement;
