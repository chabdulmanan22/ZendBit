require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const connectDB = require('../config/database');

async function createSuperAdmin() {
  try {
    await connectDB();
    
    const email = process.argv[2] || 'admin@example.com';
    const password = process.argv[3] || 'admin123';
    const name = process.argv[4] || 'Super Admin';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.log('Admin with this email already exists!');
      process.exit(1);
    }

    // Create super admin
    const admin = await Admin.create({
      email: email.toLowerCase(),
      password,
      name,
      role: 'super_admin',
    });

    console.log('Super admin created successfully!');
    console.log('Email:', admin.email);
    console.log('Name:', admin.name);
    console.log('Role:', admin.role);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();

