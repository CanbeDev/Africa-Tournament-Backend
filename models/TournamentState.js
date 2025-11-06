const mongoose = require('mongoose');

// Tournament State Schema - Tracks overall tournament progress
const tournamentStateSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    default: 'current_tournament',
    index: true
  },
  currentStage: {
    type: String,
    enum: ['registration', 'quarter', 'semi', 'final', 'completed'],
    default: 'registration',
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  quarterFinals: [{
    type: String,
    ref: 'Match'
  }],
  semiFinals: [{
    type: String,
    ref: 'Match'
  }],
  final: {
    type: String,
    ref: 'Match',
    default: null
  },
  winner: {
    type: String,
    default: null
  },
  championTeam: {
    type: String,
    default: null
  },
  runnerUp: {
    type: String,
    default: null
  },
  participatingTeams: [{
    type: String
  }],
  totalMatches: {
    type: Number,
    default: 0
  },
  completedMatches: {
    type: Number,
    default: 0
  },
  metadata: {
    quarterFinalsCompleted: {
      type: Boolean,
      default: false
    },
    semiFinalsCompleted: {
      type: Boolean,
      default: false
    },
    finalCompleted: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Static method to get or create current tournament
tournamentStateSchema.statics.getCurrent = async function() {
  let tournament = await this.findOne({ id: 'current_tournament' });
  if (!tournament) {
    tournament = await this.create({
      id: 'current_tournament',
      currentStage: 'registration'
    });
  }
  return tournament;
};

// Instance method to check if stage can be started
tournamentStateSchema.methods.canStartStage = function(stage) {
  const stageOrder = ['registration', 'quarter', 'semi', 'final', 'completed'];
  const currentIndex = stageOrder.indexOf(this.currentStage);
  const requestedIndex = stageOrder.indexOf(stage);
  
  // Can only start next stage in sequence
  return requestedIndex === currentIndex + 1;
};

// Instance method to check if all matches in current round are completed
tournamentStateSchema.methods.isCurrentRoundComplete = async function() {
  const Match = mongoose.model('Match');
  
  switch (this.currentStage) {
    case 'registration':
      return true; // Can always start from registration
      
    case 'quarter':
      if (this.quarterFinals.length === 0) return false;
      const qfMatches = await Match.find({ 
        id: { $in: this.quarterFinals },
        status: 'completed'
      });
      return qfMatches.length === this.quarterFinals.length;
      
    case 'semi':
      if (this.semiFinals.length === 0) return false;
      const sfMatches = await Match.find({ 
        id: { $in: this.semiFinals },
        status: 'completed'
      });
      return sfMatches.length === this.semiFinals.length;
      
    case 'final':
      if (!this.final) return false;
      const finalMatch = await Match.findOne({ 
        id: this.final,
        status: 'completed'
      });
      return !!finalMatch;
      
    case 'completed':
      return true;
      
    default:
      return false;
  }
};

// Instance method to advance to next stage
tournamentStateSchema.methods.advanceStage = async function() {
  const stageTransitions = {
    'registration': 'quarter',
    'quarter': 'semi',
    'semi': 'final',
    'final': 'completed'
  };
  
  const nextStage = stageTransitions[this.currentStage];
  if (!nextStage) {
    throw new Error('Cannot advance from current stage');
  }
  
  this.currentStage = nextStage;
  
  // Update metadata
  if (nextStage === 'semi') {
    this.metadata.quarterFinalsCompleted = true;
  } else if (nextStage === 'final') {
    this.metadata.semiFinalsCompleted = true;
  } else if (nextStage === 'completed') {
    this.metadata.finalCompleted = true;
    this.endDate = new Date();
  }
  
  await this.save();
  return this;
};

// Instance method to check if a match can be simulated
tournamentStateSchema.methods.canSimulateMatch = async function(matchId) {
  const Match = mongoose.model('Match');
  const match = await Match.findOne({ id: matchId });
  
  if (!match) {
    return { allowed: false, reason: 'Match not found' };
  }
  
  // Check if match is already completed
  if (match.status === 'completed') {
    return { allowed: false, reason: 'Match already completed' };
  }
  
  // Check if match belongs to current tournament stage
  const matchStageMap = {
    'quarter': 'quarter',
    'semi': 'semi',
    'final': 'final'
  };
  
  const expectedStage = matchStageMap[match.roundStage];
  if (expectedStage !== this.currentStage) {
    return { 
      allowed: false, 
      reason: `Cannot simulate ${match.roundStage} match. Current stage is ${this.currentStage}` 
    };
  }
  
  // For semi-finals, check if quarter-finals are complete
  if (match.roundStage === 'semi' && !this.metadata.quarterFinalsCompleted) {
    return { 
      allowed: false, 
      reason: 'All quarter-final matches must be completed before simulating semi-finals' 
    };
  }
  
  // For final, check if semi-finals are complete
  if (match.roundStage === 'final' && !this.metadata.semiFinalsCompleted) {
    return { 
      allowed: false, 
      reason: 'All semi-final matches must be completed before simulating the final' 
    };
  }
  
  // Check if match has both teams set (not TBD)
  if (match.homeTeam === 'TBD' || match.awayTeam === 'TBD') {
    return { 
      allowed: false, 
      reason: 'Match teams not yet determined. Previous round matches must be completed.' 
    };
  }
  
  return { allowed: true };
};

const TournamentState = mongoose.models.TournamentState || mongoose.model('TournamentState', tournamentStateSchema);

module.exports = TournamentState;

