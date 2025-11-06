const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const TournamentState = require('../models/TournamentState');
const { authenticate, authorize } = require('../middleware/auth');
const socketService = require('../services/socketService');
const { advanceWinner, checkTournamentCompletion, updateCompletedMatchesCount } = require('../services/tournamentBracket');

/**
 * POST /api/matches/start/:matchId
 * Start live match simulation with real-time commentary via WebSocket
 * Admin only
 */
router.post('/start/:matchId', authenticate, authorize('admin'), async (req, res) => {
  const { matchId } = req.params;

  try {
    // 1. Find the match
    const match = await Match.findOne({ id: matchId });
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    // 2. Check if match is already completed
    if (match.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Match already completed'
      });
    }

    // 3. Validate tournament state (if bracket match)
    if (match.roundStage) {
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
    }

    // 4. Check if match has watchers
    const watcherCount = socketService.getWatcherCount(matchId);
    console.log(`Starting match ${matchId} with ${watcherCount} watchers`);

    // 5. Set match status to live
    match.status = 'live';
    await match.save();

    // 6. Start simulation in background (non-blocking)
    simulateMatchLive(matchId, match).catch(err => {
      console.error('Match simulation error:', err);
      socketService.emitError(matchId, err);
    });

    // 7. Return immediate response
    res.json({
      success: true,
      message: 'Match simulation started',
      matchId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      stage: match.stage,
      watchers: watcherCount,
      status: 'live'
    });

  } catch (error) {
    console.error('Error starting match:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Simulate match with real-time event emission
 * This runs in the background and emits events via WebSocket
 */
async function simulateMatchLive(matchId, match) {
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  const stage = match.stage || 'Quarter Final';

  let homeScore = 0;
  let awayScore = 0;
  const goalScorers = [];
  const commentary = [];

  // Player names pool
  const playerNames = [
    'V. Osimhen', 'S. Mané', 'M. Salah', 'A. Hakimi', 'W. Ndidi', 
    'I. Perisić', 'T. Partey', 'Y. En-Nesyri', 'K. Mbappé', 'E. Haaland',
    'K. Benzema', 'R. Mahrez', 'N. Kanté', 'S. Agüero', 'L. Messi',
    'J. Kimmich', 'T. Kroos', 'S. Gnabry', 'H. Kane', 'P. Aubameyang'
  ];

  function getRandomPlayer() {
    return playerNames[Math.floor(Math.random() * playerNames.length)];
  }

  // Emit match start
  socketService.emitMatchStart(matchId, {
    homeTeam,
    awayTeam,
    stage
  });

  // Kickoff event
  const kickoffEvent = {
    minute: 0,
    type: 'kickoff',
    description: `The match is underway! ${homeTeam} kicks off against ${awayTeam}.`
  };
  commentary.push(kickoffEvent);
  socketService.emitCommentary(matchId, kickoffEvent);
  
  await sleep(2000); // 2 seconds

  // Simulate 90 minutes
  for (let minute = 1; minute <= 90; minute++) {
    const rand = Math.random();
    
    // Goal probability: 5% per minute
    if (rand < 0.05) {
      const isHomeGoal = Math.random() < 0.5;
      const scoringTeam = isHomeGoal ? homeTeam : awayTeam;
      const playerName = getRandomPlayer();
      
      if (isHomeGoal) {
        homeScore++;
      } else {
        awayScore++;
      }
      
      // Add goal event
      const goalEvent = {
        minute,
        type: 'goal',
        team: scoringTeam,
        playerName,
        description: `GOAL! ${playerName} scores for ${scoringTeam} in the ${minute} minute!`
      };
      commentary.push(goalEvent);
      
      // Emit goal with current score
      socketService.emitGoal(matchId, {
        minute,
        playerName,
        team: scoringTeam,
        type: 'normal',
        homeScore,
        awayScore
      });
      
      // Add to goal scorers
      goalScorers.push({
        playerName,
        minute,
        type: 'normal',
        team: scoringTeam
      });
      
      await sleep(3000); // Pause for goal celebration
    }
    // Attack probability: 10% per minute
    else if (rand < 0.15) {
      const attackingTeam = Math.random() < 0.5 ? homeTeam : awayTeam;
      const attackEvent = {
        minute,
        type: 'attack',
        team: attackingTeam,
        description: `${attackingTeam} launches an attack!`
      };
      commentary.push(attackEvent);
      socketService.emitCommentary(matchId, attackEvent);
      await sleep(1000);
    }
    // Possession probability: 15% per minute
    else if (rand < 0.30) {
      const possessingTeam = Math.random() < 0.5 ? homeTeam : awayTeam;
      const possessionEvent = {
        minute,
        type: 'possession',
        team: possessingTeam,
        description: `${possessingTeam} controls the ball...`
      };
      commentary.push(possessionEvent);
      socketService.emitCommentary(matchId, possessionEvent);
      await sleep(800);
    } else {
      // No event, just wait briefly
      await sleep(500);
    }
    
    // Half-time event
    if (minute === 45) {
      const halftimeEvent = {
        minute: 45,
        type: 'halftime',
        description: `Half-time! ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}.`
      };
      commentary.push(halftimeEvent);
      socketService.emitCommentary(matchId, halftimeEvent);
      await sleep(3000); // Half-time break
    }
  }
  
  // Full-time event
  const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : null;
  const fulltimeEvent = {
    minute: 90,
    type: 'fulltime',
    description: `Full-time! ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}.${winner ? ` ${winner} wins!` : ' It\'s a draw!'}`
  };
  commentary.push(fulltimeEvent);
  socketService.emitCommentary(matchId, fulltimeEvent);
  
  await sleep(2000);

  // Update match in database
  const updatedMatch = await Match.findOneAndUpdate(
    { id: matchId },
    {
      homeScore,
      awayScore,
      status: 'completed',
      winner: winner !== null ? winner : null,
      goalScorers,
      commentary
    },
    { new: true }
  );

  // Emit match end
  socketService.emitMatchEnd(matchId, {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    winner,
    goalScorers
  });

  // Update tournament completed matches count
  await updateCompletedMatchesCount();

  // Auto-advance winner if bracket match
  if (updatedMatch.roundStage && updatedMatch.winner && updatedMatch.nextMatchId) {
    try {
      const advancementResult = await advanceWinner(updatedMatch.id, updatedMatch.winner);
      console.log(`Winner ${updatedMatch.winner} advanced to ${advancementResult.nextMatch?.stage}`);
    } catch (error) {
      console.error('Failed to auto-advance winner:', error);
    }
  }

  // Check tournament completion
  if (updatedMatch.roundStage === 'final' && updatedMatch.winner) {
    await checkTournamentCompletion(updatedMatch.id);
  }

  console.log(`Match ${matchId} simulation completed: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`);
}

/**
 * Helper function to pause execution
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GET /api/matches/:matchId/status
 * Get current match status and watcher count
 */
router.get('/:matchId/status', async (req, res) => {
  const { matchId } = req.params;

  try {
    const match = await Match.findOne({ id: matchId });
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    const watcherCount = socketService.getWatcherCount(matchId);

    res.json({
      success: true,
      match: {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        stage: match.stage,
        winner: match.winner
      },
      watchers: watcherCount,
      isLive: match.status === 'live'
    });
  } catch (error) {
    console.error('Error fetching match status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;

