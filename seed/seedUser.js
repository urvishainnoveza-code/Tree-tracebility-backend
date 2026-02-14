const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../config/db');
const bcrypt = require('bcryptjs');

// ensure models that Role depends on are registered early
// finally register role model (which expects the others to exist for populate hooks)
require('../Models/role');

async function seedUser() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in environment');
  }

  await connectDB(mongoUri);

  // main flow
  const Role = mongoose.model('Role');
  console.log('Looking up role: SuperAdmin');
  let superAdminRole = await Role.findOne({ name: 'SuperAdmin' });
  if (!superAdminRole) {
    superAdminRole = await Role.create({ name: 'SuperAdmin' });
    console.log('Created Role SuperAdmin with id:', superAdminRole._id.toString());
  } else {
    console.log('Found existing SuperAdmin role with id:', superAdminRole._id.toString());
  }

  const email = 'superadmin@gmail.com';
  const plainPassword = '123456';
  const collection = mongoose.connection.collection('users');

  console.log('Checking for existing user with email:', email);
  const userDoc = await collection.findOne({ email });
  if (userDoc) console.log('Found existing user with _id:', userDoc._id.toString());

  if (!userDoc) {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const now = new Date();
    const insertDoc = {
      firstName: 'Super',
      lastName: 'Admin',
      email,
      password: hashedPassword,
      emailverified: true,
      role: superAdminRole._id,
      createdAt: now,
      updatedAt: now,
      userType: 'Admin',
    };
    const result = await collection.insertOne(insertDoc);
    console.log('Insert result:', result);
    if (result && result.insertedId) {
      console.log('✅ Super user created:', email, 'id:', result.insertedId.toString());
    } else {
      console.warn('⚠️ Super user create may have failed (no insertedId)');
    }
  } else {
    const roleIdStr = (userDoc.role && userDoc.role.toString()) || null;
    const superRoleIdStr = superAdminRole._id.toString();
    if (!roleIdStr || roleIdStr !== superRoleIdStr) {
      const updateResult = await collection.updateOne({ _id: userDoc._id }, { $set: { role: superAdminRole._id, updatedAt: new Date() } });
      console.log('Update result:', updateResult);
      if (updateResult && updateResult.matchedCount) {
        console.log('🔄 Updated super user role to SuperAdmin for user id:', userDoc._id.toString());
      } else {
        console.warn('⚠️ Update ran but did not match any document');
      }
    } else {
      console.log('ℹ️ Super user already exists and has SuperAdmin role:', email);
    }
  }
}

(async () => {
  try {
    await seedUser();
    await mongoose.connection.close();
    console.log('DB connection closed (success)');
    process.exit(0);
  } catch (err) {
    console.error('Seeding user failed:', err);
    try {
      await mongoose.connection.close();
      console.log('DB connection closed (after error)');
    } catch (e) {
      console.error('Error closing DB connection after failure:', e);
    }
    process.exit(1);
  }
})();
