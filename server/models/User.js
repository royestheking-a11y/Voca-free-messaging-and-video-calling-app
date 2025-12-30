import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSettingsSchema = new mongoose.Schema({
    theme: { type: String, default: 'dark' },
    notifications: { type: Boolean, default: true },
    pushSubscription: {
        endpoint: String,
        keys: {
            p256dh: String,
            auth: String
        }
    },
    privacy: {
        lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
        profilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
        about: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
        readReceipts: { type: Boolean, default: true }
    },
    security: {
        twoFactor: { type: Boolean, default: false }
    },
    storage: {
        autoDownloadWifi: [{ type: String, enum: ['image', 'audio', 'video', 'document'] }],
        autoDownloadCellular: [{ type: String, enum: ['image', 'audio', 'video', 'document'] }]
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // Optional for Google auth users
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    avatar: { type: String, default: '' }, // Cloudinary URL
    photos: [{ type: String }], // Array of Cloudinary URLs
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['online', 'offline', 'busy'], default: 'offline' },
    lastSeen: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    about: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    wallpaper: { type: String, default: '' },
    joinedAt: { type: Date, default: Date.now },
    settings: { type: userSettingsSchema, default: () => ({}) },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    archivedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }],
    isVocaTeam: { type: Boolean, default: false },
    isAdminPanel: { type: Boolean, default: false }, // Special flag for admin panel access only

    // Profile fields
    age: { type: Number },
    gender: { type: String },
    location: {
        city: String,
        country: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    interests: [{ type: String }],
    bio: { type: String },

    // Premium
    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date },

    // Push Notification Subscription
    pushSubscription: {
        endpoint: String,
        keys: {
            p256dh: String,
            auth: String
        }
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Transform for JSON output (remove password, add id)
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
    }
});

const User = mongoose.model('User', userSchema);
export default User;
