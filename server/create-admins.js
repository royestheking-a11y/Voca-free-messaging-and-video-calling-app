import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const createAdminAccounts = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.connection.collection('users');

        // Hash passwords
        const salt = await bcrypt.genSalt(10);
        const adminPanelPassword = await bcrypt.hash('voca@878', salt);
        const adminUserPassword = await bcrypt.hash('admin878', salt);

        // Create Admin Panel account
        const adminPanelExists = await User.findOne({ email: 'admin@voca.com' });
        if (!adminPanelExists) {
            await User.insertOne({
                name: 'Admin Panel',
                email: 'admin@voca.com',
                password: adminPanelPassword,
                role: 'admin',
                isAdminPanel: true,
                verified: true,
                status: 'online',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
                about: 'Admin Panel Access',
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('✅ Created Admin Panel account (admin@voca.com / voca@878)');
        } else {
            console.log('⚠️ Admin Panel account already exists');
        }

        // Create Admin User account
        const adminUserExists = await User.findOne({ email: 'admin@voca.app' });
        if (!adminUserExists) {
            await User.insertOne({
                name: 'Admin User',
                email: 'admin@voca.app',
                password: adminUserPassword,
                role: 'admin',
                verified: true,
                status: 'online',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
                about: 'System Administrator',
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('✅ Created Admin User account (admin@voca.app / admin878)');
        } else {
            console.log('⚠️ Admin User account already exists');
        }

        await mongoose.connection.close();
        console.log('\n✅ Done! Admin accounts are ready.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createAdminAccounts();
