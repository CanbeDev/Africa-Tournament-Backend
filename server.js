require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectToDatabase = require('./config/database');
const socketService = require('./services/socketService');

// Import routes
const authRoutes = require('./routes/auth');
const tournamentRoutes = require('./routes/tournament');
const teamRoutes = require('./routes/teams');
const matchRoutes = require('./routes/matches');
const matchStreamRoutes = require('./routes/matchStream');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('combined')); // Logging
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Note: Add these to your .env file:
// RESEND_API_KEY=re_your_api_key_here
// RESEND_FROM_EMAIL=Pan African Kicks <noreply@yourdomain.com>
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database (async)
connectToDatabase().catch(err => {
  console.error('Database connection failed:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournament', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/matches', matchStreamRoutes); // Real-time match streaming
app.use('/api/admin', adminRoutes); // Admin management routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Pan African Kicks API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
      error: 'Something went wrong!',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  });
  
  // Root route (for Render or browser visits)
  app.get('/', (req, res) => {
    res.send('🌍 Pan African Kicks Backend API is Live!');
  });
  
  // 404 handler 
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
socketService.initialize(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket ready for real-time updates`);
});
