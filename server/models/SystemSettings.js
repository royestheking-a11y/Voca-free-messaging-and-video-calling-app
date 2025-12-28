import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
    maintenanceMode: { type: Boolean, default: false },
    maxFileSize: { type: Number, default: 10 * 1024 * 1024 }, // 10MB default
    allowedFileTypes: [{ type: String }],
    appName: { type: String, default: 'Voca' },
    appVersion: { type: String, default: '1.0.0' }
}, { timestamps: true });

// There should only be one system settings document
systemSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

// Transform for JSON output
systemSettingsSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
export default SystemSettings;
