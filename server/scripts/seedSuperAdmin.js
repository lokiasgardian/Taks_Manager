import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/calendar_todo';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB for seeding');

    const name = process.env.SUPERADMIN_NAME || 'Loki Admin';
    const email = (
      process.env.SUPERADMIN_EMAIL || 'superadmin@todo.local'
    ).toLowerCase().trim();
    const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdminPass123';

    // Validate password criteria: >= 8 chars, at least 1 letter and 1 number
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      console.error(
        '❌ SUPERADMIN_PASSWORD must be at least 8 characters long and contain at least one letter and one number.'
      );
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    let adminUser = await User.findOne({ email });

    if (adminUser) {
      adminUser.name = name;
      adminUser.passwordHash = passwordHash;
      adminUser.role = 'superadmin';
      adminUser.isActive = true;
      await adminUser.save();
      console.log(`👑 Super Admin updated successfully: ${email}`);
    } else {
      adminUser = await User.create({
        name,
        email,
        passwordHash,
        role: 'superadmin',
        isActive: true,
      });
      console.log(`👑 Super Admin created successfully: ${email}`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB. Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Super Admin:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
