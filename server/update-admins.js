import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const updateAdminPasswords = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.connection.collection('users');

        // Hash passwords
        const salt = await bcrypt.genSalt(10);
        const adminPanelPassword = await bcrypt.hash('voca@878', salt);
        const adminUserPassword = await bcrypt.hash('admin878', salt);

        // Update Admin Panel account
        const result1 = await User.updateOne(
            { email: 'admin@voca.com' },
            {
                $set: {
                    password: adminPanelPassword,
                    isAdminPanel: true,
                    role: 'admin',
                    name: 'Admin Panel'
                }
            }
        );
        console.log(`✅ Updated Admin Panel (admin@voca.com): ${result1.modifiedCount} modified`);

        // Update Admin User account
        const result2 = await User.updateOne(
            { email: 'admin@voca.app' },
            {
                $set: {
                    password: adminUserPassword,
                    isAdminPanel: false,
                    role: 'admin',
                    name: 'Admin User'
                }
            }
        );
        console.log(`✅ Updated Admin User (admin@voca.app): ${result2.modifiedCount} modified`);

        // List all admin accounts
        const admins = await User.find({ role: 'admin' }).toArray();
        console.log('\n📋 Current Admin Accounts:');
        admins.forEach(admin => {
            console.log(`   - ${admin.email} (isAdminPanel: ${admin.isAdminPanel || false})`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

updateAdminPasswords();
