const { Server } = require('socket.io');
const Match = require('../models/Match');

class SocketService {
  constructor() {
    this.io = null;
    this.activeConnections = new Map(); // socketId -> connection info
    this.matchSubscriptions = new Map(); // matchId -> Set of socketIds
  }

  /**
   * Initialize Socket.io server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('✅ Socket.io initialized');
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      this.activeConnections.set(socket.id, { userId: null });

      // Handle match subscriptions
      socket.on('match:subscribe', (matchId) => this.handleMatchSubscription(socket, matchId));
      socket.on('match:unsubscribe', (matchId) => this.handleMatchUnsubscription(socket, matchId));

      // Handle authentication
      socket.on('auth', (userId) => this.handleAuthentication(socket, userId));

      // Handle disconnection
      socket.on('disconnect', () => this.handleDisconnection(socket));
    });
  }

  /**
   * Handle client subscribing to match updates
   * @param {Socket} socket - Client socket
   * @param {string} matchId - ID of match to subscribe to
   */
  async handleMatchSubscription(socket, matchId) {
    socket.join(`match:${matchId}`);

    if (!this.matchSubscriptions.has(matchId)) {
      this.matchSubscriptions.set(matchId, new Set());
    }
    this.matchSubscriptions.get(matchId).add(socket.id);

    // Send initial match state
    await this.sendMatchUpdate(matchId);
    console.log(`👀 Client ${socket.id} subscribed to match ${matchId}`);
  }

  /**
   * Handle client unsubscribing from match updates
   * @param {Socket} socket - Client socket
   * @param {string} matchId - ID of match to unsubscribe from
   */
  handleMatchUnsubscription(socket, matchId) {
    socket.leave(`match:${matchId}`);
    
    const subscribers = this.matchSubscriptions.get(matchId);
    if (subscribers) {
      subscribers.delete(socket.id);
      if (subscribers.size === 0) {
        this.matchSubscriptions.delete(matchId);
      }
    }
    console.log(`👋 Client ${socket.id} unsubscribed from match ${matchId}`);
  }

  /**
   * Handle client authentication
   * @param {Socket} socket - Client socket
   * @param {string} userId - ID of authenticated user
   */
  handleAuthentication(socket, userId) {
    const connection = this.activeConnections.get(socket.id);
    if (connection) {
      connection.userId = userId;
      console.log(`🔐 Client ${socket.id} authenticated as user ${userId}`);
    }
  }

  /**
   * Handle client disconnection
   * @param {Socket} socket - Client socket
   */
  handleDisconnection(socket) {
    console.log(`❌ Client disconnected: ${socket.id}`);
    
    // Clean up match subscriptions
    this.matchSubscriptions.forEach((subscribers, matchId) => {
      if (subscribers.has(socket.id)) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.matchSubscriptions.delete(matchId);
        }
      }
    });

    // Remove from active connections
    this.activeConnections.delete(socket.id);
  }

  /**
   * Send match state update to subscribed clients
   * @param {string} matchId - ID of match to send update for
   */
  async sendMatchUpdate(matchId) {
    try {
      const match = await Match.findOne({ id: matchId });
      if (match) {
        this.io.to(`match:${matchId}`).emit('match:update', {
          match,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(`❌ Error sending match update for ${matchId}:`, error);
    }
  }

  /**
   * Emit event to all clients subscribed to a match
   * @param {string} matchId - ID of match to emit to
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToMatch(matchId, event, data) {
    if (this.io) {
      this.io.to(`match:${matchId}`).emit(event, {
        ...data,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Emit event to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToAll(event, data) {
    if (this.io) {
      this.io.emit(event, {
        ...data,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get number of active client connections
   * @returns {number} Number of active connections
   */
  getActiveConnections() {
    return this.activeConnections.size;
  }

  /**
   * Get number of clients subscribed to a match
   * @param {string} matchId - ID of match
   * @returns {number} Number of subscribers
   */
  getMatchSubscribers(matchId) {
    return this.matchSubscriptions.get(matchId)?.size || 0;
  }
}

// Create and export singleton instance
const socketService = new SocketService();
module.exports = socketService;
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Handle user identification
      socket.on('identify', (userData) => {
        this.userSockets.set(socket.id, {
          userId: userData.userId,
          username: userData.username,
          role: userData.role
        });
        console.log(`👤 User identified: ${userData.username} (${socket.id})`);
      });

      // Handle joining match room
      socket.on('match:join', (matchId) => {
        socket.join(`match:${matchId}`);
        
        // Track active watchers
        if (!this.activeMatches.has(matchId)) {
          this.activeMatches.set(matchId, new Set());
        }
        this.activeMatches.get(matchId).add(socket.id);

        const watcherCount = this.activeMatches.get(matchId).size;
        console.log(`👥 Client ${socket.id} joined match ${matchId} (${watcherCount} watching)`);

        // Notify user they joined successfully
        socket.emit('match:joined', {
          matchId,
          watcherCount
        });

        // Broadcast updated watcher count to all in room
        this.io.to(`match:${matchId}`).emit('match:watchers', {
          matchId,
          count: watcherCount
        });
      });

      // Handle leaving match room
      socket.on('match:leave', (matchId) => {
        socket.leave(`match:${matchId}`);
        
        if (this.activeMatches.has(matchId)) {
          this.activeMatches.get(matchId).delete(socket.id);
          const watcherCount = this.activeMatches.get(matchId).size;
          
          console.log(`👋 Client ${socket.id} left match ${matchId} (${watcherCount} watching)`);

          // Broadcast updated watcher count
          this.io.to(`match:${matchId}`).emit('match:watchers', {
            matchId,
            count: watcherCount
          });

          // Clean up if no one watching
          if (watcherCount === 0) {
            this.activeMatches.delete(matchId);
          }
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        
        // Remove from all match rooms
        this.activeMatches.forEach((watchers, matchId) => {
          if (watchers.has(socket.id)) {
            watchers.delete(socket.id);
            const watcherCount = watchers.size;
            
            // Broadcast updated count
            this.io.to(`match:${matchId}`).emit('match:watchers', {
              matchId,
              count: watcherCount
            });

            // Clean up if empty
            if (watcherCount === 0) {
              this.activeMatches.delete(matchId);
            }
          }
        });

        // Remove user info
        this.userSockets.delete(socket.id);
      });
    });
  }

  /**
   * Emit match start event
   */
  emitMatchStart(matchId, matchData) {
    this.io.to(`match:${matchId}`).emit('match:start', {
      matchId,
      homeTeam: matchData.homeTeam,
      awayTeam: matchData.awayTeam,
      stage: matchData.stage,
      timestamp: new Date().toISOString()
    });
    console.log(`⚽ Match started: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
  }

  /**
   * Emit commentary event
   */
  emitCommentary(matchId, commentary) {
    this.io.to(`match:${matchId}`).emit('match:commentary', {
      matchId,
      minute: commentary.minute,
      type: commentary.type,
      description: commentary.description,
      team: commentary.team,
      playerName: commentary.playerName,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit goal event
   */
  emitGoal(matchId, goalData) {
    this.io.to(`match:${matchId}`).emit('match:goal', {
      matchId,
      minute: goalData.minute,
      playerName: goalData.playerName,
      team: goalData.team,
      type: goalData.type,
      homeScore: goalData.homeScore,
      awayScore: goalData.awayScore,
      timestamp: new Date().toISOString()
    });
    console.log(`⚽ GOAL! ${goalData.playerName} (${goalData.team}) - ${goalData.minute}'`);
  }

  /**
   * Emit score update
   */
  emitScoreUpdate(matchId, scores) {
    this.io.to(`match:${matchId}`).emit('match:score', {
      matchId,
      homeScore: scores.homeScore,
      awayScore: scores.awayScore,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit match end event
   */
  emitMatchEnd(matchId, matchResult) {
    this.io.to(`match:${matchId}`).emit('match:end', {
      matchId,
      homeTeam: matchResult.homeTeam,
      awayTeam: matchResult.awayTeam,
      homeScore: matchResult.homeScore,
      awayScore: matchResult.awayScore,
      winner: matchResult.winner,
      status: 'completed',
      timestamp: new Date().toISOString()
    });
    console.log(`🏁 Match ended: ${matchResult.homeTeam} ${matchResult.homeScore}-${matchResult.awayScore} ${matchResult.awayTeam}`);
  }

  /**
   * Emit error event to specific match room
   */
  emitError(matchId, error) {
    this.io.to(`match:${matchId}`).emit('match:error', {
      matchId,
      error: error.message || 'An error occurred',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get number of watchers for a match
   */
  getWatcherCount(matchId) {
    return this.activeMatches.has(matchId) 
      ? this.activeMatches.get(matchId).size 
      : 0;
  }

  /**
   * Check if match is being watched
   */
  isMatchActive(matchId) {
    return this.activeMatches.has(matchId) && this.activeMatches.get(matchId).size > 0;
  }

  /**
   * Get all active matches
   */
  getActiveMatches() {
    const matches = [];
    this.activeMatches.forEach((watchers, matchId) => {
      matches.push({
        matchId,
        watchers: watchers.size
      });
    });
    return matches;
  }

  /**
   * Emit bracket update event (global broadcast)
   */
  emitBracketUpdate(data) {
    this.io.emit('bracket:update', {
      tournamentStage: data.tournamentStage,
      message: data.message || 'Bracket updated',
      timestamp: new Date().toISOString()
    });
    console.log('📊 Bracket update broadcasted');
  }

  /**
   * Emit tournament stage change event
   */
  emitStageChange(oldStage, newStage) {
    this.io.emit('tournament:stage-change', {
      oldStage,
      newStage,
      timestamp: new Date().toISOString()
    });
    console.log(`📢 Tournament stage changed: ${oldStage} → ${newStage}`);
  }

  /**
   * Emit champion declared event
   */
  emitChampion(champion, runnerUp) {
    this.io.emit('tournament:champion', {
      champion,
      runnerUp,
      timestamp: new Date().toISOString()
    });
    console.log(`🏆 Champion declared: ${champion}`);
  }
}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService;

