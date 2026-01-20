const fs = require('fs');
const path = require('path');

// Generate random phone number (10 digits starting with 0)
function generateRandomPhone() {
    const firstDigit = Math.floor(Math.random() * 9) + 1; // 1-9
    const remaining = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `0${firstDigit}${remaining}`;
}

// Read users file
const usersPath = path.join(__dirname, '../frontend/src/data/users_flat.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

console.log(`📊 Found ${users.length} users`);

let updatedCount = 0;

// Update each user
users.forEach(user => {
    let updated = false;
    
    // Add email if missing
    if (!user.email) {
        user.email = `${user.username}@gmail.com`;
        updated = true;
    }
    
    // Add phone if missing
    if (!user.phone) {
        user.phone = generateRandomPhone();
        updated = true;
    }
    
    if (updated) {
        updatedCount++;
        console.log(`✅ Updated user: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Phone: ${user.phone}`);
    }
});

// Save updated data
fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');

console.log(`\n✅ Successfully updated ${updatedCount} users!`);
console.log(`📁 File saved: ${usersPath}`);
