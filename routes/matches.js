const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const validateRequest = require('../middleware/validateRequest');
const { matchSimulationValidator, matchPlayValidator } = require('../middleware/validators');

// Mock matches data (for backward compatibility)
const mockMatches = [
  {
    id: 1,
    homeTeam: 'Egypt',
    awayTeam: 'Algeria',
    homeScore: 2,
    awayScore: 1,
    status: 'completed',
    date: '2024-01-15T15:00:00Z',
    group: 'A'
  },
  {
    id: 2,
    homeTeam: 'Nigeria',
    awayTeam: 'Ghana',
    homeScore: 1,
    awayScore: 0,
    status: 'completed',
    date: '2024-01-15T18:00:00Z',
    group: 'A'
  },
  {
    id: 3,
    homeTeam: 'Senegal',
    awayTeam: 'Morocco',
    homeScore: 3,
    awayScore: 1,
    status: 'completed',
    date: '2024-01-16T15:00:00Z',
    group: 'B'
  },
  {
    id: 4,
    homeTeam: 'Cameroon',
    awayTeam: 'Ivory Coast',
    homeScore: 2,
    awayScore: 2,
    status: 'completed',
    date: '2024-01-16T18:00:00Z',
    group: 'B'
  },
  {
    id: 5,
    homeTeam: 'Egypt',
    awayTeam: 'Nigeria',
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    date: '2024-01-20T15:00:00Z',
    group: 'Quarter Final'
  }
];

// GET /api/matches - Get all matches (mock + database)
router.get('/', async (req, res) => {
  try {
    const { status, group } = req.query;
    
    // Build query for database matches
    const query = {};
    if (status) query.status = status;
    if (group) query.group = group;
    
    // Get matches from database
    const dbMatches = await Match.find(query).sort({ date: -1 }).lean();
    
    // Get mock matches if no filters or if they match filters
    let mockFiltered = mockMatches;
    if (status) {
      mockFiltered = mockFiltered.filter(m => m.status === status);
    }
    if (group) {
      mockFiltered = mockFiltered.filter(m => m.group === group);
    }
    
    // Combine mock and database matches
    const allMatches = [...mockFiltered, ...dbMatches];
    
    res.json({
      success: true,
      data: allMatches,
      count: allMatches.length
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    // Fallback to mock matches only
    res.json({
      success: true,
      data: mockMatches,
      count: mockMatches.length
    });
  }
});

// GET /api/matches/recent - Get 5 most recent completed matches
router.get('/recent', async (req, res) => {
  try {
    // Get 5 most recent completed matches from database
    const dbMatches = await Match.find({ status: 'completed' })
      .sort({ date: -1 })
      .limit(5)
      .lean();
    
    // Also get mock completed matches
    const mockCompleted = mockMatches
      .filter(m => m.status === 'completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    // Combine and sort
    const allCompleted = [...mockCompleted, ...dbMatches]
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      .slice(0, 5);
    
    res.json(allCompleted);
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    // Fallback to mock matches
    const mockCompleted = mockMatches
      .filter(m => m.status === 'completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    res.json(mockCompleted);
  }
});

// GET /api/matches/live - Get currently live/active matches
router.get('/live', async (req, res) => {
  try {
    // Get live matches from database
    const dbLiveMatches = await Match.find({ 
      status: { $in: ['live', 'active'] } 
    }).lean();
    
    // Get mock live matches
    const mockLive = mockMatches.filter(m => m.status === 'live' || m.status === 'active');
    
    // Combine
    const allLiveMatches = [...mockLive, ...dbLiveMatches];
    
    res.json({
      success: true,
      data: allLiveMatches,
      count: allLiveMatches.length
    });
  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// GET /api/matches/:id - Get specific match with full details
router.get('/:id', async (req, res) => {
  try {
    const matchId = req.params.id;
    
    // Try to find in mock matches first (numeric IDs)
    const numericId = parseInt(matchId);
    if (!isNaN(numericId)) {
      const mockMatch = mockMatches.find(m => m.id === numericId);
      if (mockMatch) {
        return res.json({
          success: true,
          data: {
            id: mockMatch.id,
            homeTeam: mockMatch.homeTeam,
            awayTeam: mockMatch.awayTeam,
            homeScore: mockMatch.homeScore || 0,
            awayScore: mockMatch.awayScore || 0,
            status: mockMatch.status,
            date: mockMatch.date,
            stage: mockMatch.stage || mockMatch.group,
            winner: mockMatch.winner,
            goalScorers: mockMatch.goalScorers || [],
            commentary: mockMatch.commentary || [],
            createdAt: mockMatch.createdAt
          }
        });
      }
    }
    
    // Try to find in database (string IDs)
    const match = await Match.findOne({ id: matchId }).lean();
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    // Return match with all details (scoreline, goal scorers, commentary)
    res.json({
      success: true,
      data: {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore || 0,
        awayScore: match.awayScore || 0,
        status: match.status,
        date: match.date,
        stage: match.stage || match.group,
        winner: match.winner,
        goalScorers: match.goalScorers || [],
        commentary: match.commentary || [],
        createdAt: match.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching match',
      message: error.message
    });
  }
});

// GET /api/matches/:id/details - Get comprehensive match details (public endpoint)
router.get('/:id/details', async (req, res) => {
  try {
    const matchId = req.params.id;
    
    // Find match in database
    const match = await Match.findOne({ id: matchId }).lean();
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    // Get team squads if available
    const Team = require('../models/Team');
    const homeTeamData = await Team.findOne({ country: match.homeTeam }).lean();
    const awayTeamData = await Team.findOne({ country: match.awayTeam }).lean();
    
    // Build comprehensive response
    res.json({
      success: true,
      data: {
        // Basic match info
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore || 0,
        awayScore: match.awayScore || 0,
        status: match.status,
        date: match.date,
        stage: match.stage,
        roundStage: match.roundStage,
        winner: match.winner,
        matchType: match.matchType || 'simulated',
        
        // Match events
        goalScorers: match.goalScorers || [],
        commentary: match.commentary || [],
        
        // Statistics
        statistics: match.statistics || {
          possession: { home: 50, away: 50 },
          shots: { home: 0, away: 0 },
          shotsOnTarget: { home: 0, away: 0 },
          corners: { home: 0, away: 0 },
          fouls: { home: 0, away: 0 },
          yellowCards: { home: 0, away: 0 },
          redCards: { home: 0, away: 0 },
          passAccuracy: { home: 0, away: 0 }
        },
        
        // Team squads (if available)
        squads: {
          home: homeTeamData ? {
            federation: homeTeamData.federation,
            manager: homeTeamData.manager,
            rating: homeTeamData.rating,
            players: homeTeamData.players
          } : null,
          away: awayTeamData ? {
            federation: awayTeamData.federation,
            manager: awayTeamData.manager,
            rating: awayTeamData.rating,
            players: awayTeamData.players
          } : null
        },
        
        createdAt: match.createdAt,
        updatedAt: match.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching match details:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching match details',
      message: error.message
    });
  }
});

// GET /api/matches/team/:teamId - Get all matches for a specific team
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Find team to get country name
    const Team = require('../models/Team');
    const team = await Team.findOne({ id: teamId }).lean();
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Get all matches for this team (by country name)
    const matches = await Match.find({
      $or: [
        { homeTeam: team.country },
        { awayTeam: team.country }
      ]
    }).sort({ date: -1 }).lean();

    // Calculate team-specific match details
    const matchDetails = matches.map(match => {
      const isHome = match.homeTeam === team.country;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;
      const opponent = isHome ? match.awayTeam : match.homeTeam;
      
      let result = null;
      if (match.status === 'completed') {
        if (teamScore > opponentScore) result = 'won';
        else if (teamScore < opponentScore) result = 'lost';
        else result = 'drawn';
      }

      // Get goals scored by this team's players
      const teamGoals = (match.goalScorers || []).filter(scorer => {
        // Check if the scorer is from this team (basic check)
        return scorer.team === team.country || (isHome && scorer.isHome) || (!isHome && !scorer.isHome);
      });

      return {
        ...match,
        teamPerspective: {
          isHome,
          teamScore,
          opponentScore,
          opponent,
          result,
          teamGoals
        }
      };
    });

    res.json({
      success: true,
      data: matchDetails,
      count: matchDetails.length,
      team: {
        id: team.id,
        country: team.country
      }
    });

  } catch (error) {
    console.error('Error fetching team matches:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching team matches',
      message: error.message
    });
  }
});

// POST /api/matches/simulate - Simulate a match with full details (Admin only)
const { authenticate, authorize, getUsers } = require('../middleware/auth');
const { simulateFullMatch, simulateMatchWithRatings } = require('../services/matchSimulator');
const { notifyFederations, notifyViewers, notifyFederationTeamVictory } = require('../services/email');
const { advanceWinner, checkTournamentCompletion, updateCompletedMatchesCount } = require('../services/tournamentBracket');
const { resolveKnockoutOutcome } = require('../services/knockoutResolver');
const TournamentState = require('../models/TournamentState');

router.post(
  '/simulate',
  authenticate,
  authorize('admin'),
  matchSimulationValidator,
  validateRequest,
  async (req, res) => {
  try {
    const { homeTeam, awayTeam, matchId, stage } = req.body;
    
    // If matchId is provided, find and update the existing match
    if (matchId) {
      // Try to find in mock matches first (numeric ID)
      const numericId = parseInt(matchId);
      let existingMatch = null;
      
      if (!isNaN(numericId)) {
        existingMatch = mockMatches.find(m => m.id === numericId);
      }
      
      // If not in mock, try database
      if (!existingMatch) {
        existingMatch = await Match.findOne({ id: matchId }).lean();
      }
      
      if (!existingMatch) {
        return res.status(404).json({
          success: false,
          error: 'Match not found'
        });
      }
      
      // Simulate the full match with detailed results
      const simulatedResult = simulateFullMatch(
        existingMatch.homeTeam || homeTeam,
        existingMatch.awayTeam || awayTeam,
        existingMatch.stage || existingMatch.group || stage || 'Quarter Final'
      );

      const { matchResult, replayRequired, decidedBy } = resolveKnockoutOutcome(existingMatch, simulatedResult);
      
      // Update match in database if it's from database (string ID), otherwise it's mock (read-only)
      const matchIdStr = String(matchId);
      if (matchIdStr.startsWith('match_')) {
        // Check tournament state before allowing simulation
        const tournamentState = await TournamentState.getCurrent();
        const canSimulate = await tournamentState.canSimulateMatch(matchId);
        
        if (!canSimulate.allowed) {
          return res.status(400).json({
            success: false,
            error: 'Match simulation not allowed',
            reason: canSimulate.reason,
            currentStage: tournamentState.currentStage
          });
        }
        
        const updatedMatch = await Match.findOneAndUpdate(
          { id: matchId },
          {
            ...matchResult,
            id: matchId // Keep original ID
          },
          { new: true, upsert: false }
        ).lean();

        if (replayRequired) {
          return res.json({
            success: true,
            data: updatedMatch,
            message: 'Match ended in a draw. Replay scheduled to determine a winner before advancing.'
          });
        }

        // Update completed matches count
        await updateCompletedMatchesCount();
        
        // Auto-advance winner if this is a bracket match with a winner
        let advancementResult = null;
        if (updatedMatch.roundStage && updatedMatch.winner && updatedMatch.nextMatchId) {
          try {
            advancementResult = await advanceWinner(updatedMatch.id, updatedMatch.winner);
          } catch (error) {
            console.error('Failed to auto-advance winner:', error);
            // Don't fail the simulation, just log the error
          }
        }
        
        // Check if tournament is completed (final match finished)
        let tournamentCompletion = null;
        if (updatedMatch.roundStage === 'final' && updatedMatch.winner) {
          tournamentCompletion = await checkTournamentCompletion(updatedMatch.id);
        }
        
        // Get user emails for notifications
        const users = await getUsers();
        const federationEmails = users
          .filter(u => u.role === 'federation_rep')
          .map(u => u.email);
        const viewerEmails = users
          .filter(u => u.role === 'viewer')
          .map(u => u.email);
        
        // Send email notifications (async, don't wait)
        const notificationPromises = [
          federationEmails.length > 0 && notifyFederations(updatedMatch, federationEmails),
          viewerEmails.length > 0 && notifyViewers(updatedMatch, viewerEmails)
        ].filter(Boolean);

        if (updatedMatch.winner) {
          const winnerUser = await User.findOne({ role: 'federation_rep', country: updatedMatch.winner }).lean();
          if (winnerUser) {
            notificationPromises.push(notifyFederationTeamVictory(updatedMatch, winnerUser));
          }
        }

        Promise.all(notificationPromises).catch(err => console.error('Notification error:', err));
        
        const response = {
          success: true,
          data: updatedMatch,
          message: decidedBy === 'penalties'
            ? 'Match decided on penalties. Notifications sent.'
            : 'Match simulated successfully. Notifications sent.'
        };
        
        // Include advancement info if it occurred
        if (advancementResult) {
          response.advancement = advancementResult;
          response.message += ` Winner advanced to ${advancementResult.nextMatch?.stage}.`;
          
          // Include stage transition if it occurred
          if (advancementResult.stageTransition) {
            response.stageTransition = advancementResult.stageTransition;
          }
        }
        
        // Include tournament completion if it occurred
        if (tournamentCompletion && tournamentCompletion.completed) {
          response.tournamentCompleted = tournamentCompletion;
          response.message += ` 🏆 Tournament completed! Champion: ${tournamentCompletion.champion}!`;
        }
        
        return res.json(response);
      } else {
        // Mock match - return simulated result but don't save
        return res.json({
          success: true,
          data: {
            ...existingMatch,
            ...matchResult,
            id: existingMatch.id
          },
          message: 'Match simulated (mock match, not saved to database)'
        });
      }
    }
    
    // If matchId is not provided, require homeTeam and awayTeam
    if (!homeTeam || !awayTeam) {
      return res.status(400).json({
        success: false,
        error: 'Either matchId is required, or both homeTeam and awayTeam are required'
      });
    }
    
    // Simulate a new match with full details
    const simulatedResult = simulateFullMatch(homeTeam, awayTeam, stage || 'Quarter Final');
    const { matchResult, replayRequired } = resolveKnockoutOutcome({}, simulatedResult);
    
    // Store match in database
    const savedMatch = await Match.create(matchResult);
    
    if (replayRequired) {
      return res.json({
        success: true,
        data: savedMatch,
        message: 'Match ended in a draw and has been flagged for replay.'
      });
    }

    // Get user emails for notifications
    const users = await getUsers();
    const federationEmails = users
      .filter(u => u.role === 'federation_rep')
      .map(u => u.email);
    const viewerEmails = users
      .filter(u => u.role === 'viewer')
      .map(u => u.email);
    
    // Send email notifications (async, don't wait)
    Promise.all([
      federationEmails.length > 0 && notifyFederations(savedMatch, federationEmails),
      viewerEmails.length > 0 && notifyViewers(savedMatch, viewerEmails)
    ]).catch(err => console.error('Notification error:', err));
    
    // Return saved match as plain object
    const matchResponse = {
      id: savedMatch.id,
      homeTeam: savedMatch.homeTeam,
      awayTeam: savedMatch.awayTeam,
      homeScore: savedMatch.homeScore,
      awayScore: savedMatch.awayScore,
      status: savedMatch.status,
      date: savedMatch.date,
      stage: savedMatch.stage,
      winner: savedMatch.winner,
      goalScorers: savedMatch.goalScorers,
      commentary: savedMatch.commentary,
      createdAt: savedMatch.createdAt
    };
    
    res.json({
      success: true,
      data: matchResponse,
      message: 'Match simulated successfully. Notifications sent.'
    });
    
  } catch (error) {
    console.error('Match simulation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
  }
);

// POST /api/matches/play - Play a match with AI commentary (Admin only)
router.post(
  '/play',
  authenticate,
  authorize('admin'),
  matchPlayValidator,
  validateRequest,
  async (req, res) => {
  try {
    const { matchId } = req.body;
    
    if (!matchId) {
      return res.status(400).json({
        success: false,
        error: 'matchId is required'
      });
    }
    
    // Find the match
    const existingMatch = await Match.findOne({ id: matchId }).lean();
    
    if (!existingMatch) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    // Check tournament state
    const tournamentState = await TournamentState.getCurrent();
    const canSimulate = await tournamentState.canSimulateMatch(matchId);
    
    if (!canSimulate.allowed) {
      return res.status(400).json({
        success: false,
        error: 'Match simulation not allowed',
        reason: canSimulate.reason,
        currentStage: tournamentState.currentStage
      });
    }
    
    // Get team data for ratings-based simulation
    const Team = require('../models/Team');
    const homeTeamData = await Team.findOne({ country: existingMatch.homeTeam }).lean();
    const awayTeamData = await Team.findOne({ country: existingMatch.awayTeam }).lean();
    
    if (!homeTeamData || !awayTeamData) {
      return res.status(400).json({
        success: false,
        error: 'Team data not found. Cannot play match without registered teams.'
      });
    }
    
    // Use the ratings-based simulator
    const simulatedResult = simulateMatchWithRatings(
      homeTeamData,
      awayTeamData,
      existingMatch.stage || existingMatch.group || 'Quarter Final'
    );
    
    // Mark as 'played' to differentiate from quick simulations
    simulatedResult.matchType = 'played';

    const { matchResult, replayRequired, decidedBy } = resolveKnockoutOutcome(existingMatch, simulatedResult);
    
    // Update match in database
    const updatedMatch = await Match.findOneAndUpdate(
      { id: matchId },
      {
        ...matchResult,
        id: matchId // Keep original ID
      },
      { new: true, upsert: false }
    ).lean();
    
    if (replayRequired) {
      return res.json({
        success: true,
        data: updatedMatch,
        message: 'Match ended in a draw. Replay required before tournament can progress.'
      });
    }

    // Update completed matches count
    await updateCompletedMatchesCount();
    
    // Auto-advance winner if this is a bracket match
    let advancementResult = null;
    if (updatedMatch.roundStage && updatedMatch.winner && updatedMatch.nextMatchId) {
      try {
        advancementResult = await advanceWinner(updatedMatch.id, updatedMatch.winner);
      } catch (error) {
        console.error('Failed to auto-advance winner:', error);
      }
    }
    
    // Check if tournament is completed
    let tournamentCompletion = null;
    if (updatedMatch.roundStage === 'final' && updatedMatch.winner) {
      tournamentCompletion = await checkTournamentCompletion(updatedMatch.id);
    }
    
    // Send notifications
    const users = await getUsers();
    const federationEmails = users.filter(u => u.role === 'federation_rep').map(u => u.email);
    const viewerEmails = users.filter(u => u.role === 'viewer').map(u => u.email);
    
    const notificationPromises = [
      federationEmails.length > 0 && notifyFederations(updatedMatch, federationEmails),
      viewerEmails.length > 0 && notifyViewers(updatedMatch, viewerEmails)
    ].filter(Boolean);

    if (updatedMatch.winner) {
      const winnerUser = await User.findOne({ role: 'federation_rep', country: updatedMatch.winner }).lean();
      if (winnerUser) {
        notificationPromises.push(notifyFederationTeamVictory(updatedMatch, winnerUser));
      }
    }

    Promise.all(notificationPromises).catch(err => console.error('Notification error:', err));
    
    const response = {
      success: true,
      data: updatedMatch,
      message: decidedBy === 'penalties'
        ? 'Match decided on penalties with live commentary! Notifications sent.'
        : 'Match played with live commentary! Notifications sent.'
    };
    
    if (advancementResult) {
      response.advancement = advancementResult;
      response.message += ` Winner advanced to ${advancementResult.nextMatch?.stage}.`;
      
      if (advancementResult.stageTransition) {
        response.stageTransition = advancementResult.stageTransition;
      }
    }
    
    if (tournamentCompletion && tournamentCompletion.completed) {
      response.tournamentCompleted = tournamentCompletion;
      response.message += ` 🏆 Tournament completed! Champion: ${tournamentCompletion.champion}!`;
    }
    
    return res.json(response);
    
  } catch (error) {
    console.error('Match play error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
  }
);

module.exports = router;
