const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/delivery_system';

// Generate random phone number (10 digits starting with 0)
function generateRandomPhone() {
    const firstDigit = Math.floor(Math.random() * 9) + 1; // 1-9
    const remaining = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `0${firstDigit}${remaining}`;
}

async function setUserContactInfo() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find users without email or phone
        const users = await User.find({
            $or: [
                { email: { $in: [null, '', undefined] } },
                { phone: { $in: [null, '', undefined] } }
            ]
        });

        console.log(`\n📊 Found ${users.length} users without email or phone`);
        
        let updatedCount = 0;

        for (const user of users) {
            const updates = {};
            
            // Set email if missing
            if (!user.email || user.email === '') {
                updates.email = `${user.username}@gmail.com`;
            }
            
            // Set phone if missing
            if (!user.phone || user.phone === '') {
                updates.phone = generateRandomPhone();
            }

            if (Object.keys(updates).length > 0) {
                await User.updateOne(
                    { _id: user._id },
                    { $set: updates }
                );
                
                updatedCount++;
                console.log(`✅ Updated user #${user.id} (${user.username})`);
                if (updates.email) console.log(`   Email: ${updates.email}`);
                if (updates.phone) console.log(`   Phone: ${updates.phone}`);
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} users!`);

        // Show summary
        const allUsers = await User.find({});
        const withEmail = allUsers.filter(u => u.email && u.email !== '').length;
        const withPhone = allUsers.filter(u => u.phone && u.phone !== '').length;
        
        console.log('\n📈 Summary:');
        console.log(`   Total users: ${allUsers.length}`);
        console.log(`   Users with email: ${withEmail}`);
        console.log(`   Users with phone: ${withPhone}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

setUserContactInfo();
