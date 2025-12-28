import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Status from './models/Status.js';
import Post from './models/Post.js';
import User from './models/User.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const cleanupData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Delete Statuses with blob: URLs
        const statusResult = await Status.deleteMany({
            mediaUrl: { $regex: /^blob:/ }
        });
        console.log(`Deleted ${statusResult.deletedCount} statuses with blob URLs`);

        // 2. Delete Posts with blob: URLs (in imageUrl)
        const postResult = await Post.deleteMany({
            imageUrl: { $regex: /^blob:/ }
        });
        console.log(`Deleted ${postResult.deletedCount} posts with blob URLs`);

        // 3. Reset User Avatars with blob: URLs to default
        const users = await User.find({ avatar: { $regex: /^blob:/ } });
        let userCount = 0;

        for (const user of users) {
            // Reset to a default avatar or Cloudinary placeholder if you have one
            user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
            await user.save();
            userCount++;
        }
        console.log(`Reset avatars for ${userCount} users with blob URLs`);

        console.log('Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

cleanupData();
