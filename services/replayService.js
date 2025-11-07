const Match = require('../models/Match');
const socketService = require('./socketService');

class ReplayService {
    constructor() {
        this.activeReplays = new Map(); // matchId -> replay state
    }

    /**
     * Start a replay session for a match
     * @param {string} matchId - Match ID
     * @param {number} startTime - Start time in match minutes
     * @param {number} endTime - End time in match minutes
     * @returns {Promise<Object>} Replay session info
     */
    async startReplay(matchId, startTime, endTime) {
        try {
            const match = await Match.findOne({ id: matchId });
            if (!match) {
                throw new Error('Match not found');
            }

            // Filter events within the time range
            const events = match.commentary
                .filter(event => event.minute >= startTime && event.minute <= endTime)
                .sort((a, b) => a.timestamp - b.timestamp);

            if (events.length === 0) {
                throw new Error('No events found in the specified time range');
            }

            const replaySession = {
                matchId,
                events,
                currentIndex: 0,
                startTime,
                endTime,
                isPlaying: false,
                playbackSpeed: 1,
                viewers: new Set()
            };

            this.activeReplays.set(matchId, replaySession);
            return { sessionId: matchId, eventCount: events.length };
        } catch (error) {
            console.error('Error starting replay:', error);
            throw error;
        }
    }

    /**
     * Join a replay session
     * @param {string} matchId - Match ID
     * @param {string} userId - User ID
     */
    joinReplay(matchId, userId) {
        const session = this.activeReplays.get(matchId);
        if (!session) {
            throw new Error('Replay session not found');
        }

        session.viewers.add(userId);
        
        // Send initial state
        socketService.emitToMatch(matchId, 'replay:join', {
            currentEvent: session.events[session.currentIndex],
            totalEvents: session.events.length,
            isPlaying: session.isPlaying,
            playbackSpeed: session.playbackSpeed
        });
    }

    /**
     * Control replay playback
     * @param {string} matchId - Match ID
     * @param {string} action - Action to perform (play, pause, next, previous, speed)
     * @param {*} value - Optional value for the action (e.g., playback speed)
     */
    controlReplay(matchId, action, value) {
        const session = this.activeReplays.get(matchId);
        if (!session) {
            throw new Error('Replay session not found');
        }

        switch (action) {
            case 'play':
                session.isPlaying = true;
                this._startEventPlayback(session);
                break;
            case 'pause':
                session.isPlaying = false;
                break;
            case 'next':
                this._moveToEvent(session, session.currentIndex + 1);
                break;
            case 'previous':
                this._moveToEvent(session, session.currentIndex - 1);
                break;
            case 'speed':
                session.playbackSpeed = value;
                break;
            default:
                throw new Error('Invalid replay control action');
        }

        // Notify all viewers of the change
        this._broadcastReplayState(session);
    }

    /**
     * Move to a specific event in the replay
     * @private
     */
    _moveToEvent(session, index) {
        if (index < 0 || index >= session.events.length) {
            return;
        }

        session.currentIndex = index;
        const event = session.events[index];

        socketService.emitToMatch(session.matchId, 'replay:event', {
            event,
            index: session.currentIndex,
            total: session.events.length
        });
    }

    /**
     * Start automatic event playback
     * @private
     */
    async _startEventPlayback(session) {
        while (session.isPlaying && session.currentIndex < session.events.length - 1) {
            const currentEvent = session.events[session.currentIndex];
            const nextEvent = session.events[session.currentIndex + 1];
            
            // Calculate delay based on real match time difference and playback speed
            const delay = (nextEvent.timestamp - currentEvent.timestamp) / session.playbackSpeed;
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            if (session.isPlaying) { // Check if still playing after delay
                this._moveToEvent(session, session.currentIndex + 1);
            }
        }

        if (session.currentIndex >= session.events.length - 1) {
            session.isPlaying = false;
            this._broadcastReplayState(session);
        }
    }

    /**
     * Broadcast current replay state to all viewers
     * @private
     */
    _broadcastReplayState(session) {
        socketService.emitToMatch(session.matchId, 'replay:state', {
            currentIndex: session.currentIndex,
            isPlaying: session.isPlaying,
            playbackSpeed: session.playbackSpeed,
            currentEvent: session.events[session.currentIndex],
            totalEvents: session.events.length
        });
    }

    /**
     * End a replay session
     * @param {string} matchId - Match ID
     */
    endReplay(matchId) {
        const session = this.activeReplays.get(matchId);
        if (session) {
            session.isPlaying = false;
            socketService.emitToMatch(matchId, 'replay:end', {
                reason: 'Session ended'
            });
            this.activeReplays.delete(matchId);
        }
    }

    /**
     * Get highlight events from a match
     * @param {string} matchId - Match ID
     * @returns {Promise<Array>} Highlight events
     */
    async getHighlights(matchId) {
        const match = await Match.findOne({ id: matchId });
        if (!match) {
            throw new Error('Match not found');
        }

        return match.commentary.filter(event => 
            ['goal', 'penalty-goal', 'penalty-miss', 'red-card', 'highlight'].includes(event.type)
        );
    }
}

// Create and export singleton instance
const replayService = new ReplayService();
module.exports = replayService;