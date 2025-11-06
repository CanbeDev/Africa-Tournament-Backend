# Tournament Bracket Progression System

## Overview
This system manages the tournament bracket with automatic progression from Quarter-finals → Semi-finals → Final. It handles bracket initialization, winner advancement, validation, and state management in MongoDB.

## Architecture

### Database Schema Changes
**Match Model** (`backend/models/Match.js`)
- `roundStage`: Enum ['quarter', 'semi', 'final'] - Identifies the tournament stage
- `nextMatchId`: String reference to the next round's match ID
- Both fields are indexed for query performance

### Services

#### Tournament Bracket Service (`backend/services/tournamentBracket.js`)

**`initializeBracket(teams)`**
- Creates complete bracket structure with all 7 matches upfront
- Generates: 4 quarter-finals → 2 semi-finals → 1 final
- Links matches via `nextMatchId`
- Semi-finals and finals start with "TBD" teams
- Automatically cleans up on failure (atomic operation)

**`advanceWinner(matchId, winnerId)`**
- Validates match completion and winner eligibility
- Determines correct position in next match (home/away)
- Updates next match with winner
- Changes next match status to 'scheduled' when both teams are set
- Handles final match case (no advancement needed)

**`validateProgression(matchId)`**
- Validates match completion status
- Checks winner is set
- Verifies round stage integrity
- Validates next match reference exists

**`getBracketState()`**
- Returns complete bracket structure with current state
- Organized by round: quarterFinals, semiFinals, final
- Includes all match details and progression status

#### Match Simulator Integration (`backend/services/matchSimulator.js`)

**`simulateMatchWithAdvancement()`**
- Extended simulator function with auto-advancement callback
- Automatically advances winners after match completion
- Non-blocking - simulation succeeds even if advancement fails

## API Endpoints

### POST `/api/tournament/start`
**Auth Required**: Admin only

Initializes complete tournament bracket with 8 teams.

**Response**:
```json
{
  "success": true,
  "message": "Tournament bracket initialized successfully",
  "bracket": {
    "quarterFinals": [...],
    "semiFinals": [...],
    "final": {...}
  },
  "totalMatches": 7
}
```

**Validations**:
- Requires exactly 8 registered teams
- Prevents duplicate tournament creation
- Selects top 8 teams by rating

---

### POST `/api/tournament/advance`
**Auth Required**: Admin only

Manually advances a winner to the next round.

**Request Body**:
```json
{
  "matchId": "match_quarter1_...",
  "winnerId": "Nigeria"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Winner Nigeria advanced to Semi Final",
  "completedMatch": {
    "id": "match_quarter1_...",
    "stage": "Quarter Final",
    "winner": "Nigeria"
  },
  "nextMatch": {
    "id": "match_semi1_...",
    "stage": "Semi Final",
    "homeTeam": "Nigeria",
    "awayTeam": "TBD",
    "status": "upcoming",
    "date": "2024-01-25T..."
  }
}
```

**Validations**:
- Match must exist
- Match must be completed
- Winner must be one of the match participants
- Next match must not be completed
- Cannot advance from final match

**Error Codes**:
- `400`: Invalid progression (validation failed)
- `404`: Match not found
- `500`: Server error

---

### GET `/api/tournament/bracket`
**Auth Required**: None

Returns current state of entire bracket.

**Response**:
```json
{
  "success": true,
  "bracket": {
    "quarterFinals": [
      {
        "id": "match_quarter1_...",
        "homeTeam": "Nigeria",
        "awayTeam": "Ghana",
        "homeScore": 2,
        "awayScore": 1,
        "winner": "Nigeria",
        "status": "completed",
        "date": "2024-01-20T...",
        "nextMatchId": "match_semi1_..."
      }
      // ... 3 more quarter-finals
    ],
    "semiFinals": [
      {
        "id": "match_semi1_...",
        "homeTeam": "Nigeria",
        "awayTeam": "TBD",
        "status": "upcoming",
        // ...
      }
      // ... 1 more semi-final
    ],
    "final": {
      "id": "match_final_...",
      "homeTeam": "TBD",
      "awayTeam": "TBD",
      "status": "upcoming",
      // ...
    }
  }
}
```

---

### POST `/api/tournament/validate`
**Auth Required**: Admin only

Validates if a match can progress to next round.

**Request Body**:
```json
{
  "matchId": "match_quarter1_..."
}
```

**Response**:
```json
{
  "success": true,
  "validation": {
    "valid": true,
    "errors": null,
    "match": {
      "id": "match_quarter1_...",
      "stage": "Quarter Final",
      "roundStage": "quarter",
      "status": "completed",
      "winner": "Nigeria",
      "nextMatchId": "match_semi1_..."
    }
  }
}
```

---

### POST `/api/tournament/restart`
**Auth Required**: Admin only

Deletes all bracket matches and resets tournament.

**Response**:
```json
{
  "success": true,
  "message": "Tournament has been restarted successfully",
  "deletedMatches": 7
}
```

---

### POST `/api/matches/simulate`
**Auth Required**: Admin only

Simulates a match with **automatic winner advancement** for bracket matches.

**Request Body**:
```json
{
  "matchId": "match_quarter1_...",
  "homeTeam": "Nigeria",  // optional if matchId provided
  "awayTeam": "Ghana",     // optional if matchId provided
  "stage": "Quarter Final" // optional
}
```

**Response** (with auto-advancement):
```json
{
  "success": true,
  "data": {
    "id": "match_quarter1_...",
    "homeTeam": "Nigeria",
    "awayTeam": "Ghana",
    "homeScore": 2,
    "awayScore": 1,
    "winner": "Nigeria",
    "status": "completed",
    "goalScorers": [...],
    "commentary": [...]
  },
  "advancement": {
    "success": true,
    "message": "Winner Nigeria advanced to Semi Final",
    "nextMatch": {...}
  },
  "message": "Match simulated successfully. Notifications sent. Winner advanced to Semi Final."
}
```

**Auto-Advancement Logic**:
1. Match is simulated with full details
2. If `roundStage` exists (bracket match) AND winner exists AND `nextMatchId` exists:
   - Automatically calls `advanceWinner()`
   - Updates next round match with winner
   - Returns advancement details in response
3. If advancement fails, simulation still succeeds (non-blocking)

## Bracket Progression Flow

### Initial State (After `/start`)
```
Quarter-Finals (Day 1-4):
  QF1: Nigeria vs Ghana       → Semi1
  QF2: Senegal vs Morocco     → Semi1
  QF3: Egypt vs Algeria       → Semi2
  QF4: Cameroon vs Mali       → Semi2

Semi-Finals (Day 7-8):
  SF1: TBD vs TBD            → Final
  SF2: TBD vs TBD            → Final

Final (Day 10):
  F: TBD vs TBD
```

### After Quarter-Finals Complete
```
Quarter-Finals:
  QF1: Nigeria 2-1 Ghana ✓    → Semi1
  QF2: Senegal 3-2 Morocco ✓  → Semi1
  QF3: Egypt 1-0 Algeria ✓    → Semi2
  QF4: Cameroon 2-2 Mali ✓    → Semi2

Semi-Finals:
  SF1: Nigeria vs Senegal     → Final
  SF2: Egypt vs Cameroon      → Final

Final:
  F: TBD vs TBD
```

### Position Assignment Logic

**Quarter → Semi**:
- First quarter-final winner of each pair → homeTeam
- Second quarter-final winner of each pair → awayTeam
- QF1 winner → SF1 home
- QF2 winner → SF1 away
- QF3 winner → SF2 home
- QF4 winner → SF2 away

**Semi → Final**:
- First semi-final winner → homeTeam
- Second semi-final winner → awayTeam

## Error Handling

### Validation Errors
- **Match not found**: Invalid matchId provided
- **Match not completed**: Cannot advance from non-completed match
- **Invalid winner**: Winner not a participant in the match
- **Already advanced**: Next match already completed
- **No next match**: Final match has no advancement

### Recovery Mechanisms
1. **Atomic Bracket Creation**: If initialization fails, all created matches are deleted
2. **Non-blocking Auto-Advancement**: Match simulation succeeds even if advancement fails
3. **Validation Before Advancement**: Prevents invalid state transitions
4. **Idempotent Operations**: Multiple calls with same data don't break state

## Database Queries

### Find all bracket matches
```javascript
Match.find({ roundStage: { $in: ['quarter', 'semi', 'final'] } })
```

### Find matches ready to advance
```javascript
Match.find({ 
  status: 'completed', 
  winner: { $ne: null },
  nextMatchId: { $ne: null },
  roundStage: { $in: ['quarter', 'semi'] }
})
```

### Find incomplete next matches
```javascript
Match.find({
  roundStage: { $in: ['semi', 'final'] },
  $or: [
    { homeTeam: 'TBD' },
    { awayTeam: 'TBD' }
  ]
})
```

## Testing

### Manual Test Flow
1. Register 8 teams via `/api/teams/register`
2. Start tournament via `/api/tournament/start`
3. Verify bracket structure via `/api/tournament/bracket`
4. Simulate quarter-final via `/api/matches/simulate` (auto-advances)
5. Check semi-final updated via `/api/tournament/bracket`
6. Validate progression via `/api/tournament/validate`
7. Complete all matches to reach final
8. Restart tournament via `/api/tournament/restart`

### Test Cases
- ✓ Bracket initialization with 8 teams
- ✓ Automatic advancement on match completion
- ✓ Manual advancement via `/advance` endpoint
- ✓ Validation of progression rules
- ✓ Error handling for invalid operations
- ✓ Final match (no advancement)
- ✓ Tournament restart

## Performance Considerations

1. **Indexes**: `roundStage` and `nextMatchId` are indexed
2. **Lean Queries**: Use `.lean()` for read-only operations
3. **Atomic Operations**: `findOneAndUpdate` for concurrent safety
4. **Batch Operations**: Bracket initialization uses single transaction-like flow

## Future Enhancements

- [ ] Third-place playoff match support
- [ ] Penalty shootout handling for draws
- [ ] Match scheduling with time conflicts detection
- [ ] Bracket visualization data structure
- [ ] Historical bracket state snapshots
- [ ] Real-time WebSocket updates for advancement
- [ ] Multi-tournament support

