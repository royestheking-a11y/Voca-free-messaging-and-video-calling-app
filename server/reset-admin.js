import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const resetAdminAccounts = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.connection.collection('users');

        // Delete old admin accounts
        console.log('🗑️ Deleting old admin accounts...');
        const deleteResult = await User.deleteMany({
            email: { $in: ['admin@voca.com', 'admin@voca.app'] }
        });
        console.log(`   Deleted ${deleteResult.deletedCount} admin account(s)`);

        // Close connection
        await mongoose.connection.close();
        console.log('✅ Done! Restart the server to seed new admin accounts.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

resetAdminAccounts();
