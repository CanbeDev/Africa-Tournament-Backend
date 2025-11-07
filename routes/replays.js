const express = require('express');
const router = express.Router();
const replayService = require('../services/replayService');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /api/replays/start
 * @desc Start a new replay session
 * @access Private
 */
router.post('/start', authenticate, async (req, res) => {
    try {
        const { matchId, startTime, endTime } = req.body;

        if (!matchId || startTime === undefined || endTime === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const session = await replayService.startReplay(matchId, startTime, endTime);
        res.json({
            success: true,
            session
        });
    } catch (error) {
        console.error('Error starting replay:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route POST /api/replays/:matchId/join
 * @desc Join a replay session
 * @access Private
 */
router.post('/:matchId/join', authenticate, (req, res) => {
    try {
        const { matchId } = req.params;
        replayService.joinReplay(matchId, req.user.id);
        res.json({
            success: true,
            message: 'Joined replay session'
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route POST /api/replays/:matchId/control
 * @desc Control replay playback
 * @access Private
 */
router.post('/:matchId/control', authenticate, (req, res) => {
    try {
        const { matchId } = req.params;
        const { action, value } = req.body;

        if (!action) {
            return res.status(400).json({
                success: false,
                message: 'Action is required'
            });
        }

        replayService.controlReplay(matchId, action, value);
        res.json({
            success: true,
            message: 'Control action applied'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route GET /api/replays/:matchId/highlights
 * @desc Get match highlights
 * @access Private
 */
router.get('/:matchId/highlights', authenticate, async (req, res) => {
    try {
        const { matchId } = req.params;
        const highlights = await replayService.getHighlights(matchId);
        res.json({
            success: true,
            highlights
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route DELETE /api/replays/:matchId
 * @desc End a replay session
 * @access Private
 */
router.delete('/:matchId', authenticate, (req, res) => {
    try {
        const { matchId } = req.params;
        replayService.endReplay(matchId);
        res.json({
            success: true,
            message: 'Replay session ended'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;