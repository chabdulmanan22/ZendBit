const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { body, validationResult } = require('express-validator');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/auth');

// Generate JWT token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Please set it in your .env file.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register new admin (only super admin can do this)
router.post(
  '/register',
  authenticateAdmin,
  requireSuperAdmin,
  [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role } = req.body;

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
      if (existingAdmin) {
        return res.status(400).json({ error: 'Admin with this email already exists' });
      }

      // Create new admin
      const admin = await Admin.create({
        email: email.toLowerCase(),
        password,
        name,
        role: role || 'admin',
      });

      res.status(201).json({
        message: 'Admin created successfully',
        admin: admin.toJSON(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const lowerEmail = (email || '').toLowerCase().trim();

      // Pure MongoDB dynamic authentication

      // MongoDB DB Check if connected
      if (mongoose.connection.readyState === 1) {
        const admin = await Admin.findOne({ email: lowerEmail });
        if (admin && admin.isActive) {
          const isMatch = admin.comparePassword(password);
          if (isMatch) {
            const token = generateToken(admin._id);
            return res.json({ token, admin: admin.toJSON() });
          }
        }
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    } catch (error) {
      console.error('[LOGIN ROUTE ERROR]', error);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  }
);

// Get current admin
router.get('/me', authenticateAdmin, async (req, res) => {
  res.json({ admin: req.admin });
});

// Get all admins (only super admin)
router.get('/admins', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update admin (only super admin)
router.put(
  '/admins/:id',
  authenticateAdmin,
  requireSuperAdmin,
  [
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, role, isActive } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (email) updates.email = email.toLowerCase();
      if (role) updates.role = role;
      if (typeof isActive === 'boolean') updates.isActive = isActive;

      const admin = await Admin.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true }
      ).select('-password');

      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      res.json(admin);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete admin (only super admin)
router.delete('/admins/:id', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Prevent deleting yourself
    if (admin._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.put(
  '/change-password',
  authenticateAdmin,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      const admin = await Admin.findById(req.admin._id);

      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      admin.password = newPassword;
      await admin.save();

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;

