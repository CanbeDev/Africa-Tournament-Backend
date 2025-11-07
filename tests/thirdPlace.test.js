const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Match = require('../models/Match');
const { createThirdPlaceMatch } = require('../services/thirdPlaceMatch');

describe('Third Place Match Tests', () => {
    let authToken;
    
    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/pan-african-kicks-test');
        
        // Get auth token for admin user
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD
            });
        
        authToken = loginResponse.body.token;
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Match.deleteMany({});
    });

    describe('POST /api/tournament/third-place', () => {
        it('should create a third place match', async () => {
            const mockData = {
                loser1Id: 'team1',
                loser2Id: 'team2',
                finalDate: new Date().toISOString()
            };

            const response = await request(app)
                .post('/api/tournament/third-place')
                .set('Authorization', `Bearer ${authToken}`)
                .send(mockData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.match.isThirdPlace).toBe(true);
            expect(response.body.match.homeTeam).toBe(mockData.loser1Id);
            expect(response.body.match.awayTeam).toBe(mockData.loser2Id);
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/tournament/third-place')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/tournament/third-place', () => {
        it('should get the third place match', async () => {
            // Create a third place match first
            const match = await createThirdPlaceMatch(
                'team1',
                'team2',
                new Date()
            );

            const response = await request(app)
                .get('/api/tournament/third-place');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.match.id).toBe(match.id);
        });

        it('should return 404 if no third place match exists', async () => {
            const response = await request(app)
                .get('/api/tournament/third-place');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
});