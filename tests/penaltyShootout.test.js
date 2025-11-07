const { simulatePenaltyShootout } = require('../services/penaltyShootout');
const Match = require('../models/Match');
const mongoose = require('mongoose');

describe('Penalty Shootout Tests', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/pan-african-kicks-test');
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Match.deleteMany({});
    });

    describe('simulatePenaltyShootout', () => {
        it('should simulate a penalty shootout and determine a winner', async () => {
            // Create a test match that ended in a draw
            const match = await Match.create({
                id: 'test_match_1',
                homeTeam: 'team1',
                awayTeam: 'team2',
                homeScore: 2,
                awayScore: 2,
                status: 'fulltime'
            });

            const result = await simulatePenaltyShootout(match);

            expect(result.status).toBe('completed');
            expect(result.penaltyShootout).toBeDefined();
            expect(result.winner).toBeDefined();
            expect(['team1', 'team2']).toContain(result.winner);

            // Verify penalty shootout structure
            expect(result.penaltyShootout.homeTeamPenalties).toBeInstanceOf(Array);
            expect(result.penaltyShootout.awayTeamPenalties).toBeInstanceOf(Array);
            expect(typeof result.penaltyShootout.homeTeamScore).toBe('number');
            expect(typeof result.penaltyShootout.awayTeamScore).toBe('number');

            // Verify scores match penalties
            const homePenaltyGoals = result.penaltyShootout.homeTeamPenalties.filter(p => p.scored).length;
            const awayPenaltyGoals = result.penaltyShootout.awayTeamPenalties.filter(p => p.scored).length;

            expect(result.penaltyShootout.homeTeamScore).toBe(homePenaltyGoals);
            expect(result.penaltyShootout.awayTeamScore).toBe(awayPenaltyGoals);

            // Verify winner is the team with more penalties
            const expectedWinner = homePenaltyGoals > awayPenaltyGoals ? 'team1' : 'team2';
            expect(result.winner).toBe(expectedWinner);
        });

        it('should throw error for invalid match state', async () => {
            const match = await Match.create({
                id: 'test_match_2',
                homeTeam: 'team1',
                awayTeam: 'team2',
                homeScore: 2,
                awayScore: 1, // Not a draw
                status: 'fulltime'
            });

            await expect(simulatePenaltyShootout(match)).rejects.toThrow('Invalid match state for penalty shootout');
        });

        it('should always end with a winner', async () => {
            const match = await Match.create({
                id: 'test_match_3',
                homeTeam: 'team1',
                awayTeam: 'team2',
                homeScore: 1,
                awayScore: 1,
                status: 'fulltime'
            });

            // Run multiple shootouts to ensure we always get a winner
            for (let i = 0; i < 10; i++) {
                const result = await simulatePenaltyShootout(match);
                expect(result.winner).toBeDefined();
                expect(['team1', 'team2']).toContain(result.winner);
                expect(result.penaltyShootout.homeTeamScore).not.toBe(result.penaltyShootout.awayTeamScore);
            }
        });
    });
});