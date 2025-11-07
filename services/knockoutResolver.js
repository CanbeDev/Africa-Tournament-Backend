const { generatePenaltyShootoutSeries } = require('./penaltyShootout');

const KNOCKOUT_ROUNDS = new Set(['quarter', 'semi', 'final', 'third_place']);

function ensureCommentaryArray(matchResult) {
  if (!Array.isArray(matchResult.commentary)) {
    matchResult.commentary = [];
  }
}

function carryForwardReplayMetadata(existingMatch, matchResult) {
  if (typeof existingMatch.replayCount === 'number' && !matchResult.replayCount) {
    matchResult.replayCount = existingMatch.replayCount;
  }

  if (Array.isArray(existingMatch.replayHistory) && !matchResult.replayHistory) {
    matchResult.replayHistory = existingMatch.replayHistory;
  }
}

function resolveKnockoutOutcome(existingMatch = {}, matchResult = {}) {
  const outcome = {
    matchResult,
    replayRequired: false,
    decidedBy: matchResult.resolution || 'regular'
  };

  if (!existingMatch.roundStage || !KNOCKOUT_ROUNDS.has(existingMatch.roundStage)) {
    matchResult.requiresReplay = false;
    matchResult.resolution = matchResult.resolution || 'regular';
    carryForwardReplayMetadata(existingMatch, matchResult);
    return outcome;
  }

  const isDraw = matchResult.homeScore === matchResult.awayScore;

  if (!isDraw) {
    matchResult.requiresReplay = false;
    matchResult.resolution = matchResult.resolution === 'penalties' ? 'penalties' : 'regular';
    carryForwardReplayMetadata(existingMatch, matchResult);
    return outcome;
  }

  const homeTeam = matchResult.homeTeam || existingMatch.homeTeam;
  const awayTeam = matchResult.awayTeam || existingMatch.awayTeam;

  if (existingMatch.roundStage === 'final') {
    const { series, winner } = generatePenaltyShootoutSeries(homeTeam, awayTeam);

    matchResult.penaltyShootout = series;
    matchResult.winner = winner;
    matchResult.requiresReplay = false;
    matchResult.resolution = 'penalties';
    ensureCommentaryArray(matchResult);

    const fulltimeEvent = matchResult.commentary.find(event => event.type === 'fulltime');
    if (fulltimeEvent) {
      fulltimeEvent.description += ' The match heads to penalties!';
    }

    matchResult.commentary.push({
      minute: 121,
      type: 'penalties',
      description: `${homeTeam} ${series.homeTeamScore} - ${series.awayTeamScore} ${awayTeam} on penalties. ${winner} lift the trophy!`
    });

    outcome.decidedBy = 'penalties';
    return outcome;
  }

  // Quarter-finals, Semi-finals, Third place -> require replay
  matchResult.requiresReplay = true;
  matchResult.status = 'requires_replay';
  matchResult.resolution = 'replay_pending';
  matchResult.winner = null;
  matchResult.penaltyShootout = null;

  const replayCount = (existingMatch.replayCount || 0) + 1;
  const replayHistory = Array.isArray(existingMatch.replayHistory)
    ? existingMatch.replayHistory.slice()
    : [];

  replayHistory.push({
    homeScore: matchResult.homeScore,
    awayScore: matchResult.awayScore,
    recordedAt: new Date()
  });

  matchResult.replayCount = replayCount;
  matchResult.replayHistory = replayHistory;

  ensureCommentaryArray(matchResult);
  matchResult.commentary.push({
    minute: 90,
    type: 'highlight',
    description: `Match ended ${matchResult.homeScore}-${matchResult.awayScore}. Replay required to determine a winner.`
  });

  outcome.replayRequired = true;
  outcome.decidedBy = 'replay_pending';
  return outcome;
}

module.exports = {
  resolveKnockoutOutcome
};

