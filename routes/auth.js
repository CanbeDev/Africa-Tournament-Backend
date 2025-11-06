const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// POST /api/auth/register - Register a new user (Admin, Federation Representative, or Viewer)
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, name, country, federation } = req.body;
    
    // Validation
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, role'
      });
    }
    
    // Validate role
    const validRoles = ['admin', 'federation_rep', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Validate federation_rep specific fields
    if (role === 'federation_rep') {
      if (!name || !country || !federation) {
        return res.status(400).json({
          success: false,
          error: 'Federation representatives require: name, country, federation'
        });
      }
    }
    
    // Validate viewer - optional name for personalization
    if (role === 'viewer') {
      // Name is optional for viewers, but can be provided for personalization
      // No additional required fields
    }
    
    // Check if user already exists in database
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Generate unique user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create user in database (password will be hashed by pre-save hook)
    const newUser = await User.create({
      id: userId,
      email: email.toLowerCase(),
      password: password, // Will be hashed by pre-save hook
      role: role,
      name: name || null,
      country: country || null,
      federation: federation || null
    });
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
        country: newUser.country,
        federation: newUser.federation
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user (without password) and token
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      country: newUser.country,
      federation: newUser.federation,
      createdAt: newUser.createdAt
    };
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token: token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/auth/login - Login and receive JWT token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password'
      });
    }
    
    // Find user in database
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Verify password using model method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        country: user.country,
        federation: user.federation
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user (without password) and token
    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      country: user.country,
      federation: user.federation,
      createdAt: user.createdAt
    };
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token: token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/auth/me - Get currently logged-in user details (protected)
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, (req, res) => {
  try {
    // User info is attached by authenticate middleware
    const userResponse = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name,
      country: req.user.country,
      federation: req.user.federation
    };
    
    res.json({
      success: true,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;

