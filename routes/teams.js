const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { authenticate, authorize } = require('../middleware/auth');

// Mock teams data (for backward compatibility with existing endpoints)
const mockTeams = [
  { id: 1, name: 'Egypt', flag: '🇪🇬', rating: 85, group: 'A', points: 6 },
  { id: 2, name: 'Nigeria', flag: '🇳🇬', rating: 82, group: 'A', points: 4 },
  { id: 3, name: 'Senegal', flag: '🇸🇳', rating: 88, group: 'B', points: 7 },
  { id: 4, name: 'Morocco', flag: '🇲🇦', rating: 80, group: 'B', points: 3 },
  { id: 5, name: 'Algeria', flag: '🇩🇿', rating: 78, group: 'C', points: 5 },
  { id: 6, name: 'Ghana', flag: '🇬🇭', rating: 75, group: 'C', points: 2 },
  { id: 7, name: 'Cameroon', flag: '🇨🇲', rating: 83, group: 'D', points: 6 },
  { id: 8, name: 'Ivory Coast', flag: '🇨🇮', rating: 79, group: 'D', points: 4 }
];

// GET /api/teams - Get all teams (mock + registered from database, active only)
router.get('/', async (req, res) => {
  try {
    // Get active registered teams from database
    const registeredTeams = await Team.find({ isActive: true });
    
    // Combine mock teams with registered teams
    const allTeams = [...mockTeams, ...registeredTeams.map(t => ({
      id: t.id,
      name: t.country,
      flag: getCountryFlag(t.country),
      rating: t.rating,
      group: null,
      points: 0
    }))];
    
    res.json({
      success: true,
      data: allTeams,
      count: allTeams.length
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    // Fallback to mock teams only
    res.json({
      success: true,
      data: mockTeams,
      count: mockTeams.length
    });
  }
});

// GET /api/teams/:teamId/player-stats - Get aggregated player statistics for a team
router.get('/:teamId/player-stats', authenticate, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Find the team
    const team = await Team.findOne({ id: teamId }).lean();
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }
    
    // Get all matches for this team
    const Match = require('../models/Match');
    const matches = await Match.find({
      $or: [
        { homeTeam: team.country },
        { awayTeam: team.country }
      ],
      status: 'completed'
    }).lean();
    
    // Aggregate player statistics across all matches
    const playerStatsMap = {};
    
    matches.forEach(match => {
      if (match.playerStats && Array.isArray(match.playerStats)) {
        match.playerStats
          .filter(ps => ps.team === team.country)
          .forEach(ps => {
            if (!playerStatsMap[ps.playerName]) {
              playerStatsMap[ps.playerName] = {
                playerName: ps.playerName,
                position: ps.position,
                matchesPlayed: 0,
                totalMinutes: 0,
                goals: 0,
                assists: 0,
                shots: 0,
                shotsOnTarget: 0,
                xG: 0,
                passes: 0,
                passesCompleted: 0,
                tackles: 0,
                interceptions: 0,
                fouls: 0,
                yellowCards: 0,
                redCards: 0,
                injuries: 0,
                averageRating: 0,
                totalRating: 0
              };
            }
            
            const stats = playerStatsMap[ps.playerName];
            stats.matchesPlayed++;
            stats.totalMinutes += ps.minutesPlayed || 0;
            stats.goals += ps.goals || 0;
            stats.assists += ps.assists || 0;
            stats.shots += ps.shots || 0;
            stats.shotsOnTarget += ps.shotsOnTarget || 0;
            stats.xG += ps.xG || 0;
            stats.passes += ps.passes || 0;
            stats.passesCompleted += Math.floor((ps.passes || 0) * (ps.passAccuracy || 0) / 100);
            stats.tackles += ps.tackles || 0;
            stats.interceptions += ps.interceptions || 0;
            stats.fouls += ps.fouls || 0;
            stats.yellowCards += ps.yellowCard ? 1 : 0;
            stats.redCards += ps.redCard ? 1 : 0;
            stats.injuries += ps.injured ? 1 : 0;
            stats.totalRating += ps.rating || 0;
          });
      }
    });
    
    // Calculate averages and format results
    const playerStats = Object.values(playerStatsMap).map(stats => ({
      ...stats,
      averageRating: stats.matchesPlayed > 0 
        ? parseFloat((stats.totalRating / stats.matchesPlayed).toFixed(1)) 
        : 0,
      passAccuracy: stats.passes > 0 
        ? Math.round((stats.passesCompleted / stats.passes) * 100) 
        : 0,
      xG: parseFloat(stats.xG.toFixed(2)),
      // Add current injury status (if injured in last match)
      currentlyInjured: stats.injuries > 0 && matches.length > 0 
        ? (matches[matches.length - 1].playerStats || [])
            .find(ps => ps.playerName === stats.playerName && ps.injured) !== undefined
        : false
    })).sort((a, b) => b.goals - a.goals); // Sort by goals
    
    res.json({
      success: true,
      data: {
        team: {
          id: team.id,
          country: team.country,
          manager: team.manager
        },
        playerStats,
        summary: {
          totalMatches: matches.length,
          totalGoals: playerStats.reduce((sum, p) => sum + p.goals, 0),
          totalAssists: playerStats.reduce((sum, p) => sum + p.assists, 0),
          totalYellowCards: playerStats.reduce((sum, p) => sum + p.yellowCards, 0),
          totalRedCards: playerStats.reduce((sum, p) => sum + p.redCards, 0),
          totalInjuries: playerStats.reduce((sum, p) => sum + p.injuries, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching player statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching player statistics',
      message: error.message
    });
  }
});

// GET /api/teams/activity - Get 5 most recently registered/updated teams
router.get('/activity', async (req, res) => {
  try {
    // Get 5 most recent registered teams from database
    const registeredTeams = await Team.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    const activeTeams = registeredTeams.map(team => ({
      id: team.id,
      name: team.country,
      flagUrl: getCountryFlag(team.country)
    }));
    
    res.json(activeTeams);
  } catch (error) {
    console.error('Error fetching active teams:', error);
    res.json([]);
  }
});

// GET /api/teams/registered - Get all registered teams from database (active only)
router.get('/registered', async (req, res) => {
  try {
    // Get all active registered teams from database
    const registeredTeams = await Team.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    
    res.json({
      success: true,
      data: registeredTeams,
      count: registeredTeams.length
    });
  } catch (error) {
    console.error('Error fetching registered teams:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching registered teams',
      message: error.message
    });
  }
});

// GET /api/teams/group/:group - Get teams by group (must be before /:id)
router.get('/group/:group', (req, res) => {
  const group = req.params.group.toUpperCase();
  const groupTeams = mockTeams.filter(t => t.group === group);
  
  res.json({
    success: true,
    data: groupTeams,
    count: groupTeams.length,
    group: group
  });
});

// GET /api/teams/my-team - Get authenticated user's team with match history (Federation Rep only)
// MUST BE BEFORE /:id route to avoid route matching conflict
router.get('/my-team', authenticate, authorize('federation_rep'), async (req, res) => {
  try {
    // Debug logging
    console.log('GET /my-team - User info from JWT:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      country: req.user.country,
      name: req.user.name
    });
    
    // Find team by user's country
    const team = await Team.findOne({ country: req.user.country, isActive: true }).lean();
    
    console.log('GET /my-team - Team query result:', team ? `Found: ${team.country}` : 'NOT FOUND');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
        message: `No team registered for ${req.user.country}. Please register your team first.`
      });
    }

    // Get all matches for this team
    const Match = require('../models/Match');
    const matches = await Match.find({
      $or: [
        { homeTeam: team.country },
        { awayTeam: team.country }
      ]
    }).sort({ date: -1 }).lean();

    // Calculate team statistics
    const stats = {
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0,
      goalsScored: 0,
      goalsConceded: 0,
      currentPosition: null
    };

    matches.forEach(match => {
      if (match.status === 'completed') {
        stats.matchesPlayed++;
        
        const isHome = match.homeTeam === team.country;
        const teamScore = isHome ? match.homeScore : match.awayScore;
        const opponentScore = isHome ? match.awayScore : match.homeScore;
        
        stats.goalsScored += teamScore || 0;
        stats.goalsConceded += opponentScore || 0;
        
        if (teamScore > opponentScore) stats.matchesWon++;
        else if (teamScore < opponentScore) stats.matchesLost++;
        else stats.matchesDrawn++;
      }
    });

    // Get tournament state to check current stage
    const TournamentState = require('../models/TournamentState');
    const tournamentState = await TournamentState.getCurrent();

    // Separate upcoming and completed matches
    const upcomingMatches = matches.filter(m => m.status === 'scheduled' || m.status === 'pending');
    const completedMatches = matches.filter(m => m.status === 'completed');

    res.json({
      success: true,
      data: {
        team: {
          id: team.id,
          federation: team.federation,
          country: team.country,
          manager: team.manager,
          rating: team.rating,
          players: team.players,
          createdAt: team.createdAt
        },
        matches: {
          upcoming: upcomingMatches,
          completed: completedMatches,
          all: matches
        },
        statistics: stats,
        tournamentStage: tournamentState.currentStage
      }
    });

  } catch (error) {
    console.error('Error fetching my team:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/teams/:id - Get specific team (supports both numeric and string IDs)
router.get('/:id', async (req, res) => {
  try {
    const teamId = req.params.id;
    
    // Try to find in mock teams first (numeric IDs)
    const numericId = parseInt(teamId);
    if (!isNaN(numericId)) {
      const mockTeam = mockTeams.find(t => t.id === numericId);
      if (mockTeam) {
        return res.json({
          success: true,
          data: mockTeam
        });
      }
    }
    
    // Try to find in database (string IDs starting with 'team_')
    const team = await Team.findOne({ id: teamId }).lean();
    
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
      error: 'Error fetching team',
      message: error.message
    });
  }
});

// POST /api/teams/register - Register a new team (Federation Rep only)
router.post('/register', authenticate, authorize('federation_rep'), async (req, res) => {
  try {
    const { federation, country, manager, players } = req.body;
    
    // Debug logging
    console.log('Team registration request received:');
    console.log('- Body keys:', Object.keys(req.body));
    console.log('- Federation:', federation || 'MISSING');
    console.log('- Country:', country || 'MISSING');
    console.log('- Manager:', manager || 'MISSING');
    console.log('- Players:', Array.isArray(players) ? `${players.length} players` : 'MISSING/INVALID');
    
    // Validation: Check required fields
    if (!federation || !country || !manager || !players) {
      console.error('Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: federation, country, manager, players'
      });
    }
    
    // Validation: Must have exactly 23 players
    if (!Array.isArray(players) || players.length !== 23) {
      return res.status(400).json({
        success: false,
        error: 'Must have exactly 23 players'
      });
    }
    
    // Validation: Country must be from Africa
    const africanCountries = [
      'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
      'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros',
      'Congo', 'Democratic Republic of the Congo', 'Djibouti', 'Egypt',
      'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia',
      'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho',
      'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
      'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
      'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone',
      'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo',
      'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
    ];
    
    if (!africanCountries.includes(country)) {
      return res.status(400).json({
        success: false,
        error: 'Country must be from Africa'
      });
    }
    
    // Validation: Check player structure and count captains
    let captainCount = 0;
    const positionCounts = { GK: 0, DF: 0, MD: 0, AT: 0 };
    const validPositions = ['GK', 'DF', 'MD', 'AT'];
    
    for (const player of players) {
      // Validate player structure
      if (!player.name || !player.position || typeof player.isCaptain !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: `Invalid player structure. Each player must have: name, position (GK/DF/MD/AT), isCaptain (boolean)`
        });
      }
      
      // Validate position
      if (!validPositions.includes(player.position)) {
        return res.status(400).json({
          success: false,
          error: `Invalid position: ${player.position}. Must be one of: GK, DF, MD, AT`
        });
      }
      
      // Count positions and captains
      positionCounts[player.position]++;
      if (player.isCaptain) {
        captainCount++;
      }
    }
    
    // Validation: Must have exactly 1 captain
    if (captainCount !== 1) {
      return res.status(400).json({
        success: false,
        error: 'Must have exactly 1 captain'
      });
    }
    
    // Validation: Minimum position requirements
    if (positionCounts.GK < 1) {
      return res.status(400).json({
        success: false,
        error: 'Must have at least 1 goalkeeper (GK)'
      });
    }
    if (positionCounts.DF < 3) {
      return res.status(400).json({
        success: false,
        error: 'Must have at least 3 defenders (DF)'
      });
    }
    if (positionCounts.MD < 3) {
      return res.status(400).json({
        success: false,
        error: 'Must have at least 3 midfielders (MD)'
      });
    }
    if (positionCounts.AT < 1) {
    return res.status(400).json({
      success: false,
        error: 'Must have at least 1 attacker (AT)'
      });
    }
    
    // Generate ratings for all players
    const playersWithRatings = players.map(player => {
      const naturalPosition = player.position;
      const ratings = {
        GK: naturalPosition === 'GK' ? getRandomRating(50, 100) : getRandomRating(0, 50),
        DF: naturalPosition === 'DF' ? getRandomRating(50, 100) : getRandomRating(0, 50),
        MD: naturalPosition === 'MD' ? getRandomRating(50, 100) : getRandomRating(0, 50),
        AT: naturalPosition === 'AT' ? getRandomRating(50, 100) : getRandomRating(0, 50)
      };
      
      return {
        name: player.name,
        naturalPosition: naturalPosition,
        isCaptain: player.isCaptain,
        ratings: ratings
      };
    });
    
    // Calculate team rating: average of all players' ratings across all positions
    let totalRating = 0;
    let ratingCount = 0;
    
    playersWithRatings.forEach(player => {
      Object.values(player.ratings).forEach(rating => {
        totalRating += rating;
        ratingCount++;
      });
    });
    
    const teamRating = totalRating / ratingCount;
    
    // Check if team already exists for this country (prevent duplicates)
    const existingTeam = await Team.findOne({ country: country, isActive: true });
    if (existingTeam) {
      return res.status(409).json({
        success: false,
        error: `A team for ${country} is already registered. Use the edit squad feature to update your team.`,
        existingTeam: {
          id: existingTeam.id,
          manager: existingTeam.manager,
          createdAt: existingTeam.createdAt
        }
      });
    }
    
    // Generate unique team ID
    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Creating new team:', {
      teamId,
      country,
      manager,
      federation,
      playerCount: playersWithRatings.length
    });
    
    // Create team in database
    const newTeam = await Team.create({
      id: teamId,
      federation: federation,
      country: country,
      manager: manager,
      rating: Math.round(teamRating * 100) / 100, // Round to 2 decimal places
      players: playersWithRatings
    });
    
    console.log('Team created successfully:', {
      id: newTeam.id,
      country: newTeam.country,
      isActive: newTeam.isActive
    });
    
    // Return created team as plain object
    const teamResponse = {
      id: newTeam.id,
      federation: newTeam.federation,
      country: newTeam.country,
      manager: newTeam.manager,
      rating: newTeam.rating,
      players: newTeam.players,
      createdAt: newTeam.createdAt
    };
  
    // Return created team
    res.status(201).json(teamResponse);
    
  } catch (error) {
    console.error('Error registering team:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Helper function to generate random rating
function getRandomRating(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get country flag emoji
function getCountryFlag(country) {
  const flags = {
    'Egypt': '🇪🇬',
    'Nigeria': '🇳🇬',
    'Senegal': '🇸🇳',
    'Morocco': '🇲🇦',
    'Algeria': '🇩🇿',
    'Ghana': '🇬🇭',
    'Cameroon': '🇨🇲',
    'Ivory Coast': '🇨🇮',
    'South Africa': '🇿🇦',
    'Tunisia': '🇹🇳',
    'Kenya': '🇰🇪',
    'Uganda': '🇺🇬'
  };
  return flags[country] || '🏴';
}

// PUT /api/teams/:id/squad - Update team squad (Federation Rep only, before tournament starts)
router.put('/:id/squad', authenticate, authorize('federation_rep'), async (req, res) => {
  try {
    const { id } = req.params;
    const { players } = req.body;

    // Find the team
    const team = await Team.findOne({ id });
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if team is active
    if (!team.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit deactivated team'
      });
    }

    // Check if tournament has started (prevent editing after tournament begins)
    const TournamentState = require('../models/TournamentState');
    const tournamentState = await TournamentState.getCurrent();
    
    if (tournamentState.currentStage !== 'registration') {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit squad after tournament has started',
        currentStage: tournamentState.currentStage
      });
    }

    // Verify user owns this team (check via user's country/federation)
    if (req.user.country !== team.country) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own team'
      });
    }

    // Validate players array
    if (!Array.isArray(players) || players.length !== 23) {
      return res.status(400).json({
        success: false,
        error: 'Must have exactly 23 players'
      });
    }

    // Validate player structure and count captains
    let captainCount = 0;
    const positionCounts = { GK: 0, DF: 0, MD: 0, AT: 0 };
    const validPositions = ['GK', 'DF', 'MD', 'AT'];
    
    for (const player of players) {
      if (!player.name || !player.position || typeof player.isCaptain !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Invalid player structure'
        });
      }
      
      if (!validPositions.includes(player.position)) {
        return res.status(400).json({
          success: false,
          error: `Invalid position: ${player.position}`
        });
      }
      
      positionCounts[player.position]++;
      if (player.isCaptain) captainCount++;
    }

    if (captainCount !== 1) {
      return res.status(400).json({
        success: false,
        error: 'Must have exactly 1 captain'
      });
    }

    // Generate ratings for players
    const playersWithRatings = players.map(player => {
      const naturalPosition = player.position;
      const ratings = {
        GK: naturalPosition === 'GK' ? getRandomRating(50, 100) : getRandomRating(0, 50),
        DF: naturalPosition === 'DF' ? getRandomRating(50, 100) : getRandomRating(0, 50),
        MD: naturalPosition === 'MD' ? getRandomRating(50, 100) : getRandomRating(0, 50),
        AT: naturalPosition === 'AT' ? getRandomRating(50, 100) : getRandomRating(0, 50)
      };
      
      return {
        name: player.name,
        naturalPosition,
        isCaptain: player.isCaptain,
        ratings
      };
    });

    // Recalculate team rating
    let totalRating = 0;
    let ratingCount = 0;
    
    playersWithRatings.forEach(player => {
      Object.values(player.ratings).forEach(rating => {
        totalRating += rating;
        ratingCount++;
      });
    });
    
    const newTeamRating = Math.round((totalRating / ratingCount) * 100) / 100;

    // Update team
    team.players = playersWithRatings;
    team.rating = newTeamRating;
    await team.save();

    res.json({
      success: true,
      message: 'Squad updated successfully',
      team: {
        id: team.id,
        federation: team.federation,
        country: team.country,
        manager: team.manager,
        rating: team.rating,
        players: team.players,
        updatedAt: team.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating squad:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DELETE /api/teams/:id - Soft delete team (Admin or own team only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the team
    const team = await Team.findOne({ id });
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Authorization: Admin can delete any team, federation rep can only delete their own
    if (req.user.role !== 'admin' && req.user.country !== team.country) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own team'
      });
    }

    // Check if team is in active tournament
    const TournamentState = require('../models/TournamentState');
    const tournamentState = await TournamentState.getCurrent();
    
    if (tournamentState.participatingTeams?.includes(team.country) && 
        tournamentState.currentStage !== 'registration' &&
        tournamentState.currentStage !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete team during active tournament. Tournament must complete first.',
        currentStage: tournamentState.currentStage
      });
    }

    // Soft delete: Mark as inactive
    team.isActive = false;
    team.deactivatedAt = new Date();
    await team.save();

    res.json({
      success: true,
      message: `Team ${team.country} has been deactivated`,
      team: {
        id: team.id,
        country: team.country,
        isActive: team.isActive,
        deactivatedAt: team.deactivatedAt
      }
    });

  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/teams/:id/reactivate - Reactivate deactivated team (Admin only)
router.post('/:id/reactivate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findOne({ id });
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    if (team.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Team is already active'
      });
    }

    team.isActive = true;
    team.deactivatedAt = null;
    await team.save();

    res.json({
      success: true,
      message: `Team ${team.country} has been reactivated`,
      team: {
        id: team.id,
        country: team.country,
        isActive: team.isActive
      }
    });

  } catch (error) {
    console.error('Error reactivating team:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function to assign random group
function getRandomGroup() {
  const groups = ['A', 'B', 'C', 'D'];
  return groups[Math.floor(Math.random() * groups.length)];
}

module.exports = router;
