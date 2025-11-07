const Match = require('../models/Match');
const socketService = require('./socketService');

/**
 * Creates a third-place playoff match between the two semi-final losers
 * @param {string} loser1Id - ID of first semi-final losing team
 * @param {string} loser2Id - ID of second semi-final losing team
 * @param {Date} finalDate - Date of the final match (to schedule third place match before it)
 * @returns {Promise<Object>} Created third place match
 */
async function createThirdPlaceMatch(loser1Id, loser2Id, finalDate) {
    if (!loser1Id || !loser2Id) {
        throw new Error('Both semi-final losers are required to create third place match');
    }

    const thirdPlaceDate = new Date(finalDate);
    thirdPlaceDate.setDate(thirdPlaceDate.getDate() - 1); // Schedule one day before final

    const thirdPlaceMatch = await Match.create({
        id: `match_third_place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        homeTeam: loser1Id,
        awayTeam: loser2Id,
        status: 'upcoming',
        date: thirdPlaceDate,
        stage: 'Third Place Playoff',
        roundStage: 'third_place',
        nextMatchId: null,
        isThirdPlace: true
    });

    // Notify connected clients about the new match
    socketService.emitToAll('match:created', {
        match: thirdPlaceMatch,
        type: 'thirdPlace'
    });

    return thirdPlaceMatch;
}

/**
 * Updates tournament state with third place match result
 * @param {Object} match - The completed third place match
 * @returns {Promise<void>}
 */
async function handleThirdPlaceResult(match) {
    if (!match.winner) {
        throw new Error('Match must have a winner to update third place result');
    }

    const tournamentState = await TournamentState.findOne();
    tournamentState.thirdPlace = match.winner;
    await tournamentState.save();

    socketService.emitToAll('tournament:thirdPlace', {
        winner: match.winner
    });
}

module.exports = {
    createThirdPlaceMatch,
    handleThirdPlaceResult
};