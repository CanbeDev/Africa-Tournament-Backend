const mongoose = require('mongoose');

// Goal Scorer Schema
const goalScorerSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  minute: { type: Number, required: true, min: 0, max: 120 },
  type: { 
    type: String, 
    enum: ['normal', 'penalty', 'own-goal', 'shootout'],
    default: 'normal'
  },
  team: { type: String, required: true }
}, { _id: false });

// Commentary Event Schema
const commentaryEventSchema = new mongoose.Schema({
  minute: { type: Number, required: true, min: 0, max: 120 },
  timestamp: { type: Date, required: true, default: Date.now },
  type: { 
    type: String, 
    enum: [
      'kickoff', 'goal', 'halftime', 'fulltime', 'possession', 
      'attack', 'chance', 'yellow-card', 'red-card', 'substitution',
      'penalties', 'penalty-goal', 'penalty-miss', 'highlight'
    ],
    required: true
  },
  team: { type: String, default: null },
  playerName: { type: String, default: null },
  description: { type: String, required: true },
  replayData: {
    type: {
      positions: {
        home: [{ x: Number, y: Number }],
        away: [{ x: Number, y: Number }],
        ball: { x: Number, y: Number }
      },
      duration: Number, // duration of the replay in seconds
      startTime: Number, // when in the match this replay starts
      isHighlight: Boolean
    },
    default: null
  }
}, { _id: false });

// Player Statistics Schema
const playerStatsSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  team: { type: String, required: true },
  position: { type: String, required: true },
  minutesPlayed: { type: Number, default: 0, min: 0, max: 120 },
  goals: { type: Number, default: 0, min: 0 },
  assists: { type: Number, default: 0, min: 0 },
  shots: { type: Number, default: 0, min: 0 },
  shotsOnTarget: { type: Number, default: 0, min: 0 },
  xG: { type: Number, default: 0, min: 0 }, // Expected goals
  passes: { type: Number, default: 0, min: 0 },
  passAccuracy: { type: Number, default: 0, min: 0, max: 100 },
  tackles: { type: Number, default: 0, min: 0 },
  interceptions: { type: Number, default: 0, min: 0 },
  fouls: { type: Number, default: 0, min: 0 },
  yellowCard: { type: Boolean, default: false },
  redCard: { type: Boolean, default: false },
  injured: { type: Boolean, default: false },
  rating: { type: Number, default: 0, min: 0, max: 10 }
}, { _id: false });

// Penalty Shootout Schema
const penaltyShootoutSchema = new mongoose.Schema({
  homeTeamPenalties: [{
    playerName: { type: String, required: true },
    scored: { type: Boolean, required: true }
  }],
  awayTeamPenalties: [{
    playerName: { type: String, required: true },
    scored: { type: Boolean, required: true }
  }],
  homeTeamScore: { type: Number, required: true, min: 0 },
  awayTeamScore: { type: Number, required: true, min: 0 },
  winner: { type: String, required: true }
}, { _id: false });

// Match Schema
const matchSchema = new mongoose.Schema({
  id: { 
    type: String, 
    unique: true, 
    required: true,
    index: true
  },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  homeScore: { 
    type: Number, 
    default: 0,
    min: 0
  },
  awayScore: { 
    type: Number, 
    default: 0,
    min: 0
  },
  penaltyShootout: { 
    type: penaltyShootoutSchema,
    default: null
  },
  isThirdPlace: {
    type: Boolean,
    default: false
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'live', 'penalties', 'completed', 'upcoming', 'requires_replay'],
    default: 'scheduled',
    index: true
  },
  resolution: {
    type: String,
    enum: ['regular', 'penalties', 'replay_pending'],
    default: 'regular'
  },
  requiresReplay: {
    type: Boolean,
    default: false
  },
  replayCount: {
    type: Number,
    default: 0,
    min: 0
  },
  replayHistory: [{
    homeScore: { type: Number, min: 0 },
    awayScore: { type: Number, min: 0 },
    recordedAt: { type: Date, default: Date.now }
  }],
  date: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  stage: { 
    type: String,
    default: null
  },
  roundStage: {
    type: String,
    enum: ['quarter', 'semi', 'final', 'third_place', null],
    default: null,
    index: true
  },
  nextMatchId: {
    type: String,
    default: null,
    ref: 'Match'
  },
  group: { 
    type: String,
    default: null
  },
  winner: { 
    type: String, 
    default: null 
  },
  goalScorers: {
    type: [goalScorerSchema],
    default: []
  },
  commentary: {
    type: [commentaryEventSchema],
    default: []
  },
  matchType: {
    type: String,
    enum: ['played', 'simulated'],
    default: 'simulated'
  },
  statistics: {
    possession: {
      home: { type: Number, default: 50, min: 0, max: 100 },
      away: { type: Number, default: 50, min: 0, max: 100 }
    },
    shots: {
      home: { type: Number, default: 0, min: 0 },
      away: { type: Number, default: 0, min: 0 }
    },
    shotsOnTarget: {
      home: { type: Number, default: 0, min: 0 },
      away: { type: Number, default: 0, min: 0 }
    },
    corners: {
      home: { type: Number, default: 0, min: 0 },
      away: { type: Number, default: 0, min: 0 }
    },
    fouls: {
      home: { type: Number, default: 0, min: 0 },
      away: { type: Number, default: 0, min: 0 }
    },
    yellowCards: {
      home: { type: Number, default: 0, min: 0 },
      away: { type: Number, default: 0, min: 0 }
    },
    redCards: {
      home: { type: Number, default: 0, min: 0 },
      away: { type: Number, default: 0, min: 0 }
    },
    passAccuracy: {
      home: { type: Number, default: 0, min: 0, max: 100 },
      away: { type: Number, default: 0, min: 0, max: 100 }
    }
  },
  playerStats: {
    type: [playerStatsSchema],
    default: []
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Indexes are already defined in schema fields with "index: true"

const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);

module.exports = Match;

