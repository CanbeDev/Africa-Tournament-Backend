const Match = require('../models/Match');
const TournamentState = require('../models/TournamentState');
const socketService = require('./socketService');

/**
 * Creates a complete tournament bracket structure with all matches
 * Quarter-finals (4 matches) -> Semi-finals (2 matches) -> Final (1 match)
 * @param {Array} teams - Array of 8 team objects with country property
 * @returns {Promise<Object>} Created matches organized by round
 */
async function initializeBracket(teams) {
  if (!teams || teams.length !== 8) {
    throw new Error('Exactly 8 teams are required to initialize the bracket');
  }

  const baseTime = Date.now();
  const matches = {
    quarterFinals: [],
    semiFinals: [],
    final: null
  };

  try {
    // Step 1: Create Final match (placeholder, no teams yet)
    const finalMatch = await Match.create({
      id: `match_final_${baseTime}_${Math.random().toString(36).substr(2, 9)}`,
      homeTeam: 'TBD',
      awayTeam: 'TBD',
      status: 'upcoming',
      date: new Date(Date.now() + 86400000 * 10), // 10 days from now
      stage: 'Final',
      roundStage: 'final',
      nextMatchId: null
    });
    matches.final = finalMatch;

    // Step 2: Create Semi-final matches (2 matches)
    const semi1 = await Match.create({
      id: `match_semi1_${baseTime}_${Math.random().toString(36).substr(2, 9)}`,
      homeTeam: 'TBD',
      awayTeam: 'TBD',
      status: 'upcoming',
      date: new Date(Date.now() + 86400000 * 7), // 7 days from now
      stage: 'Semi Final',
      roundStage: 'semi',
      nextMatchId: finalMatch.id
    });

    const semi2 = await Match.create({
      id: `match_semi2_${baseTime + 1}_${Math.random().toString(36).substr(2, 9)}`,
      homeTeam: 'TBD',
      awayTeam: 'TBD',
      status: 'upcoming',
      date: new Date(Date.now() + 86400000 * 8), // 8 days from now
      stage: 'Semi Final',
      roundStage: 'semi',
      nextMatchId: finalMatch.id
    });

    matches.semiFinals = [semi1, semi2];

    // Step 3: Create Quarter-final matches (4 matches) with actual teams
    const quarterFinalPairs = [
      [teams[0].country, teams[1].country, semi1.id, 1],
      [teams[2].country, teams[3].country, semi1.id, 2],
      [teams[4].country, teams[5].country, semi2.id, 3],
      [teams[6].country, teams[7].country, semi2.id, 4]
    ];

    for (const [homeTeam, awayTeam, nextMatchId, matchNum] of quarterFinalPairs) {
      const quarterMatch = await Match.create({
        id: `match_quarter${matchNum}_${baseTime + matchNum}_${Math.random().toString(36).substr(2, 9)}`,
        homeTeam,
        awayTeam,
        status: 'scheduled',
        date: new Date(Date.now() + 86400000 * matchNum), // Staggered over 4 days
        stage: 'Quarter Final',
        roundStage: 'quarter',
        nextMatchId
      });
      matches.quarterFinals.push(quarterMatch);
    }

    // Create or update tournament state
    let tournamentState = await TournamentState.findOne({ id: 'current_tournament' });
    
    if (!tournamentState) {
      tournamentState = new TournamentState({
        id: 'current_tournament',
        currentStage: 'quarter',
        startDate: new Date(),
        quarterFinals: matches.quarterFinals.map(m => m.id),
        semiFinals: matches.semiFinals.map(m => m.id),
        final: matches.final.id,
        participatingTeams: teams.map(t => t.country),
        totalMatches: 7,
        completedMatches: 0
      });
    } else {
      // Update existing tournament
      tournamentState.currentStage = 'quarter';
      tournamentState.startDate = new Date();
      tournamentState.quarterFinals = matches.quarterFinals.map(m => m.id);
      tournamentState.semiFinals = matches.semiFinals.map(m => m.id);
      tournamentState.final = matches.final.id;
      tournamentState.participatingTeams = teams.map(t => t.country);
      tournamentState.totalMatches = 7;
      tournamentState.completedMatches = 0;
      tournamentState.winner = null;
      tournamentState.championTeam = null;
      tournamentState.runnerUp = null;
      tournamentState.metadata = {
        quarterFinalsCompleted: false,
        semiFinalsCompleted: false,
        finalCompleted: false
      };
    }
    
    await tournamentState.save();

    return { matches, tournamentState };

  } catch (error) {
    // Cleanup: If any error occurs, delete created matches
    const createdIds = [
      matches.final?.id,
      ...matches.semiFinals.map(m => m?.id),
      ...matches.quarterFinals.map(m => m?.id)
    ].filter(Boolean);

    if (createdIds.length > 0) {
      await Match.deleteMany({ id: { $in: createdIds } });
    }

    throw new Error(`Failed to initialize bracket: ${error.message}`);
  }
}

/**
 * Advances a winner to the next round of the tournament
 * Also checks and triggers automatic stage transitions
 * @param {string} matchId - The completed match ID
 * @param {string} winnerId - The winning team name
 * @returns {Promise<Object>} Updated next match and validation result
 */
async function advanceWinner(matchId, winnerId) {
  // Validate inputs
  if (!matchId || !winnerId) {
    throw new Error('matchId and winnerId are required');
  }

  // Find the completed match
  const completedMatch = await Match.findOne({ id: matchId });
  if (!completedMatch) {
    throw new Error(`Match with id ${matchId} not found`);
  }

  // Validate match is completed
  if (completedMatch.status !== 'completed') {
    throw new Error(`Match ${matchId} is not completed yet (status: ${completedMatch.status})`);
  }

  // Validate winner is one of the teams
  if (winnerId !== completedMatch.homeTeam && winnerId !== completedMatch.awayTeam) {
    throw new Error(`Winner ${winnerId} is not a participant in match ${matchId}`);
  }

  // Validate there's a next match to advance to
  if (!completedMatch.nextMatchId) {
    return {
      success: true,
      message: 'This is the final match, no advancement needed',
      isFinalMatch: true,
      winner: winnerId
    };
  }

  // Find the next match
  const nextMatch = await Match.findOne({ id: completedMatch.nextMatchId });
  if (!nextMatch) {
    throw new Error(`Next match ${completedMatch.nextMatchId} not found`);
  }

  // Validate next match is not already completed
  if (nextMatch.status === 'completed') {
    throw new Error(`Cannot advance to match ${nextMatch.id} - already completed`);
  }

  // Determine which slot to fill in the next match
  // Semi-finals feed into final based on their position
  // Quarter-finals feed into semi-finals based on their position
  let updateField;
  
  if (completedMatch.roundStage === 'quarter') {
    // For quarter-finals, find which semi-final and which position
    const quarterMatches = await Match.find({ 
      roundStage: 'quarter',
      nextMatchId: nextMatch.id 
    }).sort({ id: 1 });

    const matchIndex = quarterMatches.findIndex(m => m.id === matchId);
    // First quarter match winner goes to home, second to away
    updateField = matchIndex % 2 === 0 ? 'homeTeam' : 'awayTeam';

  } else if (completedMatch.roundStage === 'semi') {
    // For semi-finals, first semi winner goes to home, second to away
    const semiMatches = await Match.find({ 
      roundStage: 'semi' 
    }).sort({ date: 1 });

    const matchIndex = semiMatches.findIndex(m => m.id === matchId);
    updateField = matchIndex === 0 ? 'homeTeam' : 'awayTeam';

  } else {
    throw new Error(`Invalid round stage: ${completedMatch.roundStage}`);
  }

  // Update the next match with the winner
  const updateData = {
    [updateField]: winnerId
  };

  // Check if both teams are now set - if so, change status to scheduled
  if (updateField === 'homeTeam' && nextMatch.awayTeam !== 'TBD') {
    updateData.status = 'scheduled';
  } else if (updateField === 'awayTeam' && nextMatch.homeTeam !== 'TBD') {
    updateData.status = 'scheduled';
  }

  const updatedMatch = await Match.findOneAndUpdate(
    { id: nextMatch.id },
    { $set: updateData },
    { new: true }
  );

  // Check if current round is complete and trigger stage transition
  const tournamentState = await TournamentState.getCurrent();
  const roundComplete = await tournamentState.isCurrentRoundComplete();
  
  let stageTransition = null;
  if (roundComplete) {
    try {
      const oldStage = tournamentState.currentStage;
      await tournamentState.advanceStage();
      stageTransition = {
        from: oldStage,
        to: tournamentState.currentStage,
        message: `All ${oldStage} matches completed. Advanced to ${tournamentState.currentStage} stage.`
      };
      
      // Emit WebSocket event for stage change
      socketService.emitStageChange(oldStage, tournamentState.currentStage);
      socketService.emitBracketUpdate({
        tournamentStage: tournamentState.currentStage,
        message: stageTransition.message
      });
    } catch (error) {
      console.error('Stage transition error:', error);
    }
  }
  
  // Always emit bracket update when winner advances
  socketService.emitBracketUpdate({
    tournamentStage: tournamentState.currentStage,
    message: `${winnerId} advanced to ${nextMatch.stage}`
  });

  const result = {
    success: true,
    message: `Winner ${winnerId} advanced to ${nextMatch.stage}`,
    completedMatch: {
      id: completedMatch.id,
      stage: completedMatch.stage,
      winner: winnerId
    },
    nextMatch: {
      id: updatedMatch.id,
      stage: updatedMatch.stage,
      homeTeam: updatedMatch.homeTeam,
      awayTeam: updatedMatch.awayTeam,
      status: updatedMatch.status,
      date: updatedMatch.date
    }
  };

  if (stageTransition) {
    result.stageTransition = stageTransition;
  }

  return result;
}

/**
 * Validates tournament progression rules
 * @param {string} matchId - Match to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateProgression(matchId) {
  const match = await Match.findOne({ id: matchId });
  
  if (!match) {
    return {
      valid: false,
      error: 'Match not found'
    };
  }

  // Check if match is in valid progression state
  const errors = [];

  // Rule 1: Match must be completed to advance
  if (match.status !== 'completed' && match.nextMatchId) {
    errors.push('Match must be completed before advancing');
  }

  // Rule 2: Must have a winner
  if (!match.winner && match.status === 'completed') {
    errors.push('Match must have a winner to advance');
  }

  // Rule 3: Validate round stage
  if (match.roundStage && !['quarter', 'semi', 'final'].includes(match.roundStage)) {
    errors.push('Invalid round stage');
  }

  // Rule 4: If there's a next match, validate it exists
  if (match.nextMatchId) {
    const nextMatch = await Match.findOne({ id: match.nextMatchId });
    if (!nextMatch) {
      errors.push('Next match reference is invalid');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : null,
    match: {
      id: match.id,
      stage: match.stage,
      roundStage: match.roundStage,
      status: match.status,
      winner: match.winner,
      nextMatchId: match.nextMatchId
    }
  };
}

/**
 * Gets the complete bracket structure with current state and team details
 * @param {boolean} includeTeamDetails - Whether to populate team details
 * @returns {Promise<Object>} Bracket structure with tournament state
 */
async function getBracketState(includeTeamDetails = false) {
  const Team = require('../models/Team');
  
  const quarterFinals = await Match.find({ roundStage: 'quarter' }).sort({ date: 1 });
  const semiFinals = await Match.find({ roundStage: 'semi' }).sort({ date: 1 });
  const final = await Match.findOne({ roundStage: 'final' });
  const tournamentState = await TournamentState.getCurrent();

  // Helper function to get team details
  async function getTeamDetails(teamName) {
    if (!includeTeamDetails || teamName === 'TBD') {
      return null;
    }
    const team = await Team.findOne({ country: teamName }).lean();
    return team ? {
      country: team.country,
      federation: team.federation,
      manager: team.manager,
      rating: team.rating
    } : null;
  }

  // Helper function to format match with optional team details
  async function formatMatch(match) {
    const formatted = {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      winner: match.winner,
      status: match.status,
      date: match.date,
      stage: match.stage,
      nextMatchId: match.nextMatchId
    };

    if (includeTeamDetails) {
      formatted.homeTeamDetails = await getTeamDetails(match.homeTeam);
      formatted.awayTeamDetails = await getTeamDetails(match.awayTeam);
    }

    return formatted;
  }

  const quarterFinalsFormatted = await Promise.all(quarterFinals.map(formatMatch));
  const semiFinalsFormatted = await Promise.all(semiFinals.map(formatMatch));
  const finalFormatted = final ? await formatMatch(final) : null;

  return {
    tournamentState: {
      currentStage: tournamentState.currentStage,
      startDate: tournamentState.startDate,
      endDate: tournamentState.endDate,
      winner: tournamentState.championTeam,
      runnerUp: tournamentState.runnerUp,
      totalMatches: tournamentState.totalMatches,
      completedMatches: tournamentState.completedMatches,
      metadata: tournamentState.metadata
    },
    quarterFinals: quarterFinalsFormatted,
    semiFinals: semiFinalsFormatted,
    final: finalFormatted
  };
}

/**
 * Check and update tournament completion when final match ends
 * @param {string} matchId - Final match ID
 * @returns {Promise<Object>} Tournament completion details
 */
async function checkTournamentCompletion(matchId) {
  const match = await Match.findOne({ id: matchId });
  const tournamentState = await TournamentState.getCurrent();
  
  if (!match || match.roundStage !== 'final' || match.status !== 'completed') {
    return { completed: false };
  }
  
  // Update tournament state with final results
  tournamentState.championTeam = match.winner;
  tournamentState.runnerUp = match.winner === match.homeTeam ? match.awayTeam : match.homeTeam;
  tournamentState.winner = match.winner;
  tournamentState.currentStage = 'completed';
  tournamentState.endDate = new Date();
  tournamentState.metadata.finalCompleted = true;
  tournamentState.completedMatches = tournamentState.totalMatches;
  
  await tournamentState.save();
  
  // Emit WebSocket events for tournament completion
  socketService.emitChampion(tournamentState.championTeam, tournamentState.runnerUp);
  socketService.emitBracketUpdate({
    tournamentStage: 'completed',
    message: `Tournament completed! Champion: ${tournamentState.championTeam}`
  });
  
  return {
    completed: true,
    champion: tournamentState.championTeam,
    runnerUp: tournamentState.runnerUp,
    startDate: tournamentState.startDate,
    endDate: tournamentState.endDate
  };
}

/**
 * Update tournament completed matches count
 * @returns {Promise<void>}
 */
async function updateCompletedMatchesCount() {
  const tournamentState = await TournamentState.getCurrent();
  const completedCount = await Match.countDocuments({
    roundStage: { $in: ['quarter', 'semi', 'final'] },
    status: 'completed'
  });
  
  tournamentState.completedMatches = completedCount;
  await tournamentState.save();
}

module.exports = {
  initializeBracket,
  advanceWinner,
  validateProgression,
  getBracketState,
  checkTournamentCompletion,
  updateCompletedMatchesCount
};

