const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Match = require('../models/Match');
const TournamentState = require('../models/TournamentState');
const { 
  initializeBracket, 
  advanceWinner, 
  validateProgression, 
  getBracketState 
} = require('../services/tournamentBracket');

// GET /api/tournament/status - Get tournament status
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    teamsCount: 8,
    matchesPlayed: 4,
    totalGoals: 45,
    yellowCards: 23,
    redCards: 5,
    currentPhase: 'Quarter Finals'
  });
});

// GET /api/tournament/stats - Get tournament statistics
router.get('/stats', (req, res) => {
  res.json({
    totalMatches: 120,
    totalGoals: 345,
    activeFederations: 32,
    topScorer: {
      name: 'L. Messi',
      goals: 9
    }
  });
});

// GET /api/tournament/top-scorers - Get top goal scorers from database
router.get('/top-scorers', async (req, res) => {
  try {
    // Get all completed matches from database
    const completedMatches = await Match.find({ 
      status: 'completed',
      goalScorers: { $exists: true, $ne: [] }
    }).lean();
    
    // Calculate top scorers from goal scorers in matches
    const scorerMap = new Map();
    
    completedMatches.forEach(match => {
      if (match.goalScorers && Array.isArray(match.goalScorers)) {
        match.goalScorers.forEach(goalscorer => {
          const key = `${goalscorer.playerName}_${goalscorer.team}`;
          if (scorerMap.has(key)) {
            scorerMap.set(key, {
              name: goalscorer.playerName,
              team: goalscorer.team,
              goals: scorerMap.get(key).goals + 1,
              assists: scorerMap.get(key).assists || 0
            });
          } else {
            scorerMap.set(key, {
              name: goalscorer.playerName,
              team: goalscorer.team,
              goals: 1,
              assists: 0 // Assists not tracked in current schema
            });
          }
        });
      }
    });
    
    // Convert to array and sort by goals
    const topScorers = Array.from(scorerMap.values())
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10); // Top 10
    
    // If no real data, return mock data for demo
    if (topScorers.length === 0) {
      const mockScorers = [
        { name: 'L. Messi', goals: 9, team: 'Nigeria', assists: 3 },
        { name: 'V. Osimhen', goals: 8, team: 'Nigeria', assists: 2 },
        { name: 'S. Mané', goals: 7, team: 'Senegal', assists: 4 },
        { name: 'M. Salah', goals: 6, team: 'Egypt', assists: 5 },
        { name: 'A. Hakimi', goals: 5, team: 'Morocco', assists: 2 },
        { name: 'I. Perisić', goals: 5, team: 'Cameroon', assists: 1 },
        { name: 'W. Ndidi', goals: 4, team: 'Nigeria', assists: 3 },
        { name: 'K. Mbappé', goals: 4, team: 'Senegal', assists: 2 },
        { name: 'T. Partey', goals: 3, team: 'Ghana', assists: 4 },
        { name: 'Y. En-Nesyri', goals: 3, team: 'Morocco', assists: 1 }
      ];
      
      return res.json({
        success: true,
        data: mockScorers,
        count: mockScorers.length,
        note: 'Mock data (no completed matches with goals yet)'
      });
    }
    
    res.json({
      success: true,
      data: topScorers,
      count: topScorers.length
    });
    
  } catch (error) {
    console.error('Error fetching top scorers:', error);
    // Fallback to mock data
    const mockScorers = [
      { name: 'L. Messi', goals: 9, team: 'Nigeria', assists: 3 },
      { name: 'V. Osimhen', goals: 8, team: 'Nigeria', assists: 2 },
      { name: 'S. Mané', goals: 7, team: 'Senegal', assists: 4 }
    ];
    
    res.json({
      success: true,
      data: mockScorers,
      count: mockScorers.length
    });
  }
});

// POST /api/tournament/start - Start the tournament (Admin only)
const { authenticate, authorize } = require('../middleware/auth');
router.post('/start', authenticate, authorize('admin'), async (req, res) => {
  try {
    // 1. Check tournament state
    const tournamentState = await TournamentState.getCurrent();
    
    if (tournamentState.currentStage !== 'registration') {
      const existingMatches = await Match.findOne({ roundStage: { $in: ['quarter', 'semi', 'final'] } });
      if (existingMatches) {
        return res.status(400).json({
          success: false,
          error: 'Tournament already in progress. Use /restart to clear existing tournament.',
          currentStage: tournamentState.currentStage
        });
      }
    }

    // 2. Get all active registered teams from database
    const registeredTeams = await Team.find({ isActive: true })
      .sort({ rating: -1 }) // Sort by rating (highest first)
      .limit(8) // Top 8 teams
      .lean();
    
    if (registeredTeams.length < 8) {
      return res.status(400).json({
        success: false,
        error: `At least 8 teams are required to start the tournament. Currently ${registeredTeams.length} teams registered.`
      });
    }
    
    // 3. Initialize complete bracket structure (also creates/updates tournament state)
    const result = await initializeBracket(registeredTeams);
    const bracket = result.matches;
    
    // 4. Format response
    res.json({
      success: true,
      message: 'Tournament bracket initialized successfully',
      tournamentState: {
        currentStage: result.tournamentState.currentStage,
        startDate: result.tournamentState.startDate,
        totalMatches: result.tournamentState.totalMatches,
        participatingTeams: result.tournamentState.participatingTeams
      },
      bracket: {
        quarterFinals: bracket.quarterFinals.map(match => ({
          id: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          status: match.status,
          date: match.date,
          stage: match.stage,
          nextMatchId: match.nextMatchId
        })),
        semiFinals: bracket.semiFinals.map(match => ({
          id: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          status: match.status,
          date: match.date,
          stage: match.stage,
          nextMatchId: match.nextMatchId
        })),
        final: {
          id: bracket.final.id,
          homeTeam: bracket.final.homeTeam,
          awayTeam: bracket.final.awayTeam,
          status: bracket.final.status,
          date: bracket.final.date,
          stage: bracket.final.stage
        }
      },
      totalMatches: bracket.quarterFinals.length + bracket.semiFinals.length + 1,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error starting tournament:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/tournament/restart - Restart tournament (Admin only)
router.post('/restart', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Delete all tournament bracket matches
    const result = await Match.deleteMany({ 
      roundStage: { $in: ['quarter', 'semi', 'final'] } 
    });
    
    // Reset tournament state to registration
    const tournamentState = await TournamentState.getCurrent();
    tournamentState.currentStage = 'registration';
    tournamentState.startDate = null;
    tournamentState.endDate = null;
    tournamentState.quarterFinals = [];
    tournamentState.semiFinals = [];
    tournamentState.final = null;
    tournamentState.winner = null;
    tournamentState.championTeam = null;
    tournamentState.runnerUp = null;
    tournamentState.participatingTeams = [];
    tournamentState.totalMatches = 0;
    tournamentState.completedMatches = 0;
    tournamentState.metadata = {
      quarterFinalsCompleted: false,
      semiFinalsCompleted: false,
      finalCompleted: false
    };
    await tournamentState.save();
    
    res.json({
      success: true,
      message: 'Tournament has been restarted successfully',
      deletedMatches: result.deletedCount,
      tournamentState: {
        currentStage: tournamentState.currentStage
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error restarting tournament:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/tournament/bracket - Get current bracket state with optional team details
router.get('/bracket', async (req, res) => {
  try {
    // Check if team details should be included (query param: ?includeTeams=true)
    const includeTeamDetails = req.query.includeTeams === 'true';
    
    const bracket = await getBracketState(includeTeamDetails);
    
    res.json({
      success: true,
      ...bracket,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bracket:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/tournament/public/bracket - Public bracket endpoint (no auth required)
router.get('/public/bracket', async (req, res) => {
  try {
    const tournamentState = await TournamentState.getCurrent();
    
    // Get all bracket matches
    const quarterFinals = await Match.find({ roundStage: 'quarter' }).lean();
    const semiFinals = await Match.find({ roundStage: 'semi' }).lean();
    const final = await Match.findOne({ roundStage: 'final' }).lean();
    
    // Get live matches
    const liveMatches = await Match.find({ 
      status: 'live',
      roundStage: { $in: ['quarter', 'semi', 'final'] }
    }).lean();
    
    // Format matches for public consumption (hide sensitive data)
    const formatMatch = (match) => {
      if (!match) return null;
      return {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        stage: match.stage,
        roundStage: match.roundStage,
        winner: match.winner,
        date: match.date,
        matchType: match.matchType || 'simulated'
      };
    };
    
    res.json({
      success: true,
      tournamentStage: tournamentState.currentStage,
      champion: tournamentState.championTeam,
      runnerUp: tournamentState.runnerUp,
      bracket: {
        quarterFinals: quarterFinals.map(formatMatch),
        semiFinals: semiFinals.map(formatMatch),
        final: formatMatch(final)
      },
      liveMatches: liveMatches.map(formatMatch),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching public bracket:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/tournament/advance - Advance winner to next round
router.post('/advance', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { matchId, winnerId } = req.body;

    // Validate input
    if (!matchId || !winnerId) {
      return res.status(400).json({
        success: false,
        error: 'matchId and winnerId are required'
      });
    }

    // Validate progression before advancing
    const validation = await validateProgression(matchId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid progression',
        details: validation.errors,
        match: validation.match
      });
    }

    // Advance the winner
    const result = await advanceWinner(matchId, winnerId);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error advancing winner:', error);
    
    // Handle specific error types
    if (error.message.includes('not found') || 
        error.message.includes('not completed') ||
        error.message.includes('not a participant') ||
        error.message.includes('already completed')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid progression',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/tournament/validate - Validate match progression (utility endpoint)
router.post('/validate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { matchId } = req.body;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        error: 'matchId is required'
      });
    }

    const validation = await validateProgression(matchId);

    res.json({
      success: true,
      validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error validating progression:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
