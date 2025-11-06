const mongoose = require('mongoose');

// Player Ratings Schema
const playerRatingsSchema = new mongoose.Schema({
  GK: { type: Number, required: true, min: 0, max: 100 },
  DF: { type: Number, required: true, min: 0, max: 100 },
  MD: { type: Number, required: true, min: 0, max: 100 },
  AT: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

// Player Schema
const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  naturalPosition: { 
    type: String, 
    enum: ['GK', 'DF', 'MD', 'AT'], 
    required: true 
  },
  isCaptain: { type: Boolean, default: false },
  ratings: { type: playerRatingsSchema, required: true }
}, { _id: false });

// Team Schema
const teamSchema = new mongoose.Schema({
  id: { 
    type: String, 
    unique: true, 
    required: true,
    index: true
  },
  federation: { type: String, required: true },
  country: { type: String, required: true },
  manager: { type: String, required: true },
  rating: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100
  },
  players: {
    type: [playerSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 23;
      },
      message: 'Team must have exactly 23 players'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  deactivatedAt: {
    type: Date,
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes are already defined in schema fields with "index: true"

const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);

module.exports = Team;

