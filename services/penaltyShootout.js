const Match = require('../models/Match');
const socketService = require('./socketService');

/**
 * Simulates a penalty shootout between two teams
 * @param {Object} match - The match object that ended in a draw
 * @returns {Promise<Object>} Updated match with penalty shootout results
 */
async function simulatePenaltyShootout(match, options = {}) {
    if (!match || !match.homeTeam || !match.awayTeam) {
        throw new Error('Invalid match reference for penalty shootout');
    }

    const isDraw = match.homeScore === match.awayScore;
    if (!options?.allowNonDraw && !isDraw) {
        throw new Error('Invalid match state for penalty shootout');
    }

    const { series, winner } = generatePenaltyShootoutSeries(match.homeTeam, match.awayTeam);

    match.penaltyShootout = series;
    match.winner = winner;
    match.status = 'completed';
    match.resolution = 'penalties';
    match.requiresReplay = false;

    if (typeof match.save === 'function') {
        await match.save();
    }

    if (match.id) {
        socketService.emitToAll('match:penalties', {
            matchId: match.id,
            penaltyShootout: match.penaltyShootout
        });
    }

    return match;
}

function generatePenaltyShootoutSeries(homeTeam, awayTeam) {
    const homeTeamPenalties = [];
    const awayTeamPenalties = [];
    let homeTeamScore = 0;
    let awayTeamScore = 0;

    for (let i = 0; i < 5; i++) {
        const homePenalty = simulatePenalty(homeTeam);
        homeTeamPenalties.push(homePenalty);
        if (homePenalty.scored) homeTeamScore++;

        if (isShootoutDecided(homeTeamScore, awayTeamScore, i + 1)) break;

        const awayPenalty = simulatePenalty(awayTeam);
        awayTeamPenalties.push(awayPenalty);
        if (awayPenalty.scored) awayTeamScore++;

        if (isShootoutDecided(homeTeamScore, awayTeamScore, i + 1)) break;
    }

    while (homeTeamScore === awayTeamScore) {
        const homePenalty = simulatePenalty(homeTeam);
        const awayPenalty = simulatePenalty(awayTeam);

        homeTeamPenalties.push(homePenalty);
        awayTeamPenalties.push(awayPenalty);

        if (homePenalty.scored) homeTeamScore++;
        if (awayPenalty.scored) awayTeamScore++;
    }

    const winner = homeTeamScore > awayTeamScore ? homeTeam : awayTeam;

    return {
        series: {
            homeTeamPenalties,
            awayTeamPenalties,
            homeTeamScore,
            awayTeamScore,
            winner
        },
        winner
    };
}

/**
 * Simulates a single penalty kick
 * @param {string} team - The team taking the penalty
 * @returns {Object} Penalty result
 */
function simulatePenalty(team) {
    // 75% chance of scoring a penalty
    const scored = Math.random() < 0.75;
    
    return {
        playerName: `Player ${Math.floor(Math.random() * 11) + 1}`,
        scored
    };
}

/**
 * Checks if a penalty shootout is decided
 * @param {number} homeScore - Home team penalty score
 * @param {number} awayScore - Away team penalty score
 * @param {number} round - Current round (1-5)
 * @returns {boolean} Whether the shootout is decided
 */
function isShootoutDecided(homeScore, awayScore, round) {
    const remainingRounds = 5 - round;
    
    // Check if one team has an insurmountable lead
    if (homeScore > awayScore + remainingRounds) return true;
    if (awayScore > homeScore + remainingRounds) return true;
    
    return false;
}

module.exports = {
    simulatePenaltyShootout,
    generatePenaltyShootoutSeries
};