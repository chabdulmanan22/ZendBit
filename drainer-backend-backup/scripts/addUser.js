require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const connectDB = require('../config/database');

async function addUser() {
  try {
    await connectDB();
    
    const email = 'rizwansyal942@gmail.com';
    const password = '123456789';
    const name = 'Rizwan Syal';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.log('Admin with this email already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      process.exit(0);
    }

    // Create admin
    const admin = await Admin.create({
      email: email.toLowerCase(),
      password,
      name,
      role: 'super_admin',
    });

    console.log('Admin created successfully!');
    console.log('Email:', admin.email);
    console.log('Name:', admin.name);
    console.log('Role:', admin.role);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

addUser();

