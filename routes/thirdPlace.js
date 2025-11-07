const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const { createThirdPlaceMatch, handleThirdPlaceResult } = require('../services/thirdPlaceMatch');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

/**
 * @route POST /api/tournament/third-place
 * @desc Create third place playoff match between semi-final losers
 * @access Private (Admin only)
 */
router.post('/third-place', authenticate, authorizeAdmin, validateRequest, async (req, res) => {
    try {
        const { loser1Id, loser2Id, finalDate } = req.body;

        if (!loser1Id || !loser2Id || !finalDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const thirdPlaceMatch = await createThirdPlaceMatch(
            loser1Id,
            loser2Id,
            new Date(finalDate)
        );

        res.status(201).json({
            success: true,
            match: thirdPlaceMatch
        });
    } catch (error) {
        console.error('Error creating third place match:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create third place match'
        });
    }
});

/**
 * @route GET /api/tournament/third-place
 * @desc Get the third place playoff match
 * @access Public
 */
router.get('/third-place', async (req, res) => {
    try {
        const thirdPlaceMatch = await Match.findOne({ isThirdPlace: true });
        
        if (!thirdPlaceMatch) {
            return res.status(404).json({
                success: false,
                message: 'Third place match not found'
            });
        }

        res.json({
            success: true,
            match: thirdPlaceMatch
        });
    } catch (error) {
        console.error('Error fetching third place match:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch third place match'
        });
    }
});

module.exports = router;