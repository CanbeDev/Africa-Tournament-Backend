const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();
const { sendFederationWelcomeEmail } = require('../services/email');
const validateRequest = require('../middleware/validateRequest');
const { userRegisterValidator, userLoginValidator } = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     description: |
 *       Create a new account for administrators, federation representatives, or viewers.
 *       Federation representatives must supply their name, country, and federation details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegisterRequest'
 *           examples:
 *             federationRepresentative:
 *               summary: Federation representative registration
 *               value:
 *                 email: 'rep@federation.org'
 *                 password: 'SecurePass123!'
 *                 role: 'federation_rep'
 *                 name: 'Kwesi Appiah'
 *                 country: 'Ghana'
 *                 federation: 'Ghana Football Association'
 *             viewer:
 *               summary: Viewer sign-up
 *               value:
 *                 email: 'fan@example.com'
 *                 password: 'FanPass456!'
 *                 role: 'viewer'
 *                 name: 'Fatima Diallo'
 *     responses:
 *       '201':
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '409':
 *         $ref: '#/components/responses/ConflictError'
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
// POST /api/auth/register - Register a new user (Admin, Federation Representative, or Viewer)
router.post('/register', userRegisterValidator, validateRequest, async (req, res) => {
  try {
    const { email, password, role, name, country, federation } = req.body;
    
    // Validate federation_rep specific fields
    if (role === 'federation_rep') {
      if (!name || !country || !federation) {
        logger.warn('Federation representative registration missing required fields', {
          email,
        });
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
      logger.warn('Registration attempt for existing user', { email: email.toLowerCase() });
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
    
    // Trigger welcome email for federation reps (fire and forget)
    if (role === 'federation_rep') {
      sendFederationWelcomeEmail({
        email: newUser.email,
        name: newUser.name,
        country: newUser.country,
        federation: newUser.federation
      }).catch(err => {
        logger.error('Welcome email error', {
          email: newUser.email,
          error: err.message,
          stack: err.stack,
        });
      });
    }

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
    
    logger.info('User registration successful', {
      userId: newUser.id,
      role: newUser.role,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token: token
    });
    
  } catch (error) {
    logger.error('Registration error', {
      email: req.body?.email,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Authenticate and obtain access token
 *     description: Validate user credentials and return a JWT access token along with the user profile.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginRequest'
 *           examples:
 *             login:
 *               summary: Standard login request
 *               value:
 *                 email: 'rep@federation.org'
 *                 password: 'SecurePass123!'
 *     responses:
 *       '200':
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
// POST /api/auth/login - Login and receive JWT token
router.post('/login', userLoginValidator, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user in database
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      logger.warn('Login failed: user not found', { email: email.toLowerCase() });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Verify password using model method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn('Login failed: invalid password', { userId: user.id, email: user.email });
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
    
    logger.info('User login successful', {
      userId: user.id,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token: token
    });
    
  } catch (error) {
    logger.error('Login error', {
      email: req.body?.email,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Retrieve authenticated user profile
 *     description: Returns the currently authenticated user's profile details extracted from the JWT token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Authenticated user details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
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
    
    logger.debug('User fetched profile', {
      userId: req.user.id,
    });

    res.json({
      success: true,
      user: userResponse
    });
    
  } catch (error) {
    logger.error('Get user error', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;

