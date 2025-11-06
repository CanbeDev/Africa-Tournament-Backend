const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Team = require('../models/Team');
const Match = require('../models/Match');
const TournamentState = require('../models/TournamentState');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// POST /api/admin/create-user - Create new user (Admin only)
router.post('/create-user', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { email, password, role, name, country, federation } = req.body;

    // Validation
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and role are required'
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

    // For federation_rep, require additional fields
    if (role === 'federation_rep' && (!name || !country || !federation)) {
      return res.status(400).json({
        success: false,
        error: 'Federation representatives require: name, country, and federation'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      role,
      name: name || email.split('@')[0],
      country: country || null,
      federation: federation || null
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
        country: newUser.country,
        federation: newUser.federation,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/admin/users - Get all users (Admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/admin/teams - Get all teams with full details (Admin only)
router.get('/teams', authenticate, authorize('admin'), async (req, res) => {
  try {
    const teams = await Team.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: teams,
      count: teams.length
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/admin/teams/:id - Get team by ID with full squad (Admin only)
router.get('/teams/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const team = await Team.findOne({ id: req.params.id }).lean();
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/admin/teams/:id - Delete team (Admin only)
router.delete('/teams/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const team = await Team.findOneAndDelete({ id: req.params.id });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      message: `Team ${team.country} deleted successfully`,
      deletedTeam: {
        id: team.id,
        country: team.country,
        manager: team.manager
      }
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/admin/teams/delete-multiple - Bulk delete teams (Admin only)
router.post('/teams/delete-multiple', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { teamIds } = req.body;

    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'teamIds array is required'
      });
    }

    const result = await Team.deleteMany({ id: { $in: teamIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} team(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting teams:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/admin/tournament/reset-matches - Reset all match results (Admin only)
router.post('/tournament/reset-matches', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Reset all matches to scheduled/upcoming status
    const result = await Match.updateMany(
      { roundStage: { $in: ['quarter', 'semi', 'final'] } },
      {
        $set: {
          status: 'upcoming',
          homeScore: 0,
          awayScore: 0,
          winner: null,
          goalScorers: [],
          commentary: []
        }
      }
    );

    // Reset semi-finals and final to TBD teams
    await Match.updateMany(
      { roundStage: 'semi' },
      { $set: { homeTeam: 'TBD', awayTeam: 'TBD' } }
    );

    await Match.updateMany(
      { roundStage: 'final' },
      { $set: { homeTeam: 'TBD', awayTeam: 'TBD' } }
    );

    // Reset tournament state
    const tournamentState = await TournamentState.getCurrent();
    tournamentState.currentStage = 'quarter';
    tournamentState.completedMatches = 0;
    tournamentState.winner = null;
    tournamentState.championTeam = null;
    tournamentState.runnerUp = null;
    tournamentState.endDate = null;
    tournamentState.metadata = {
      quarterFinalsCompleted: false,
      semiFinalsCompleted: false,
      finalCompleted: false
    };
    await tournamentState.save();

    res.json({
      success: true,
      message: 'All match results reset successfully',
      matchesReset: result.modifiedCount,
      tournamentStage: tournamentState.currentStage
    });
  } catch (error) {
    console.error('Error resetting matches:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/admin/stats - Get comprehensive admin statistics (Admin only)
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const tournamentState = await TournamentState.getCurrent();
    
    // Count teams
    const totalTeams = await Team.countDocuments({});
    
    // Count matches by status
    const totalMatches = await Match.countDocuments({ 
      roundStage: { $in: ['quarter', 'semi', 'final'] } 
    });
    const completedMatches = await Match.countDocuments({ 
      roundStage: { $in: ['quarter', 'semi', 'final'] },
      status: 'completed'
    });
    const liveMatches = await Match.countDocuments({ status: 'live' });
    const pendingMatches = totalMatches - completedMatches;

    // Count users by role
    const totalUsers = await User.countDocuments({});
    const adminCount = await User.countDocuments({ role: 'admin' });
    const fedRepCount = await User.countDocuments({ role: 'federation_rep' });
    const viewerCount = await User.countDocuments({ role: 'viewer' });

    // Get bracket matches
    const quarterFinals = await Match.find({ roundStage: 'quarter' }).lean();
    const semiFinals = await Match.find({ roundStage: 'semi' }).lean();
    const finalMatch = await Match.findOne({ roundStage: 'final' }).lean();

    res.json({
      success: true,
      tournament: {
        currentStage: tournamentState.currentStage,
        startDate: tournamentState.startDate,
        endDate: tournamentState.endDate,
        champion: tournamentState.championTeam,
        totalMatches,
        completedMatches,
        pendingMatches,
        liveMatches
      },
      teams: {
        total: totalTeams,
        participating: tournamentState.participatingTeams?.length || 0
      },
      users: {
        total: totalUsers,
        admins: adminCount,
        federationReps: fedRepCount,
        viewers: viewerCount
      },
      matches: {
        quarterFinals: {
          total: quarterFinals.length,
          completed: quarterFinals.filter(m => m.status === 'completed').length
        },
        semiFinals: {
          total: semiFinals.length,
          completed: semiFinals.filter(m => m.status === 'completed').length
        },
        final: {
          exists: !!finalMatch,
          completed: finalMatch?.status === 'completed'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/admin/matches - Get all matches for admin management (Admin only)
router.get('/matches', authenticate, authorize('admin'), async (req, res) => {
  try {
    const matches = await Match.find({ 
      roundStage: { $in: ['quarter', 'semi', 'final'] } 
    })
    .sort({ date: 1 })
    .lean();

    res.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;

