const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// JWT authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided. Please login.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Support default Super Admin fallback session
    if (decoded.id === 'default_super_admin_id') {
      req.admin = {
        _id: 'default_super_admin_id',
        email: 'support@bitnovaswap.com',
        name: 'BitNovaSwap Super Admin',
        role: 'super_admin',
        isActive: true
      };
      return next();
    }

    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive admin account.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    res.status(500).json({ error: 'Authentication error.' });
  }
};

// Check if admin is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied. Super admin required.' });
  }
  next();
};

module.exports = { authenticateAdmin, requireSuperAdmin };
