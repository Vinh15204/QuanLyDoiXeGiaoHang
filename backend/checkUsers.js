const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/qldxgh')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const users = await User.find({}, 'id username role').sort({ id: 1 });
    
    console.log('\n=== Current Users ===');
    console.log('Total:', users.length);
    console.log('\nAdmins (should be 1-99):');
    users.filter(u => u.role === 'admin').forEach(u => 
      console.log(`  ID: ${u.id}, Username: ${u.username}`)
    );
    
    console.log('\nDrivers (should be 100-999):');
    users.filter(u => u.role === 'driver').forEach(u => 
      console.log(`  ID: ${u.id}, Username: ${u.username}`)
    );
    
    console.log('\nUsers (should be 1000+):');
    users.filter(u => u.role === 'user').forEach(u => 
      console.log(`  ID: ${u.id}, Username: ${u.username}`)
    );
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
