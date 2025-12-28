import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// User schema (simplified)
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    avatar: String,
    isVocaTeam: Boolean
}, { strict: false });

const User = mongoose.model('User', userSchema);

const imagePath = '/Users/mdsunny/.gemini/antigravity/brain/96261a02-f250-4588-8215-fa9696f98e05/uploaded_image_1766864707702.png';

async function updateVocaTeamPhoto() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Upload to Cloudinary
        console.log('📤 Uploading image to Cloudinary...');
        const result = await cloudinary.uploader.upload(imagePath, {
            folder: 'voca/profiles',
            public_id: 'voca-team-avatar',
            overwrite: true,
            transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'center' }
            ]
        });

        console.log('✅ Uploaded to Cloudinary:', result.secure_url);

        // Update Voca Team user
        const updated = await User.findOneAndUpdate(
            { isVocaTeam: true },
            { avatar: result.secure_url },
            { new: true }
        );

        if (updated) {
            console.log('✅ Updated Voca Team user:', updated.name);
            console.log('   New avatar URL:', updated.avatar);
        } else {
            console.log('⚠️ Voca Team user not found in database');
        }

        // Output the URL for the seeder update
        console.log('\n📋 Use this URL in server/index.js:');
        console.log(result.secure_url);

        await mongoose.disconnect();
        console.log('✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateVocaTeamPhoto();
