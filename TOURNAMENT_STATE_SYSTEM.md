# Tournament State Management System

## Overview
The TournamentState system manages the overall tournament progression, enforces round completion rules, and tracks tournament status through stages: **registration** → **quarter** → **semi** → **final** → **completed**.

## Key Features

✅ **Stage Progression Tracking** - Enforces sequential stage transitions  
✅ **Round Completion Validation** - Prevents simulating matches out of order  
✅ **Automatic Stage Transitions** - Auto-advances when all round matches complete  
✅ **Tournament State Persistence** - Stores complete tournament state in MongoDB  
✅ **Team Details in Bracket** - Optional inclusion of team info in bracket endpoint  

---

## TournamentState Model

### Schema Fields

```javascript
{
  id: 'current_tournament',              // Singleton document
  currentStage: 'registration',          // Current tournament stage
  startDate: Date,                       // When tournament started
  endDate: Date,                         // When tournament completed
  quarterFinals: [String],               // Array of match IDs
  semiFinals: [String],                  // Array of match IDs
  final: String,                         // Final match ID
  winner: String,                        // Champion team name
  championTeam: String,                  // Tournament winner
  runnerUp: String,                      // Runner-up team
  participatingTeams: [String],          // All 8 team names
  totalMatches: 7,                       // Always 7 for knockout
  completedMatches: 0,                   // Count of completed matches
  metadata: {
    quarterFinalsCompleted: Boolean,
    semiFinalsCompleted: Boolean,
    finalCompleted: Boolean
  }
}
```

### Stage Enum
- `registration` - Initial state, accepting team registrations
- `quarter` - Quarter-finals in progress
- `semi` - Semi-finals in progress
- `final` - Final match in progress
- `completed` - Tournament finished

---

## Stage Progression Rules

### Registration → Quarter
**Allowed When:**
- At least 8 teams registered
- Admin calls `/api/tournament/start`

**Actions:**
- Creates all 7 matches
- Sets `currentStage = 'quarter'`
- Records `startDate`

### Quarter → Semi
**Allowed When:**
- All 4 quarter-final matches completed
- All quarter-finals have winners

**Actions:**
- Automatically triggered when 4th QF completes
- Sets `metadata.quarterFinalsCompleted = true`
- Updates `currentStage = 'semi'`

### Semi → Final
**Allowed When:**
- Both semi-final matches completed
- Both semi-finals have winners

**Actions:**
- Automatically triggered when 2nd SF completes
- Sets `metadata.semiFinalsCompleted = true`
- Updates `currentStage = 'final'`

### Final → Completed
**Allowed When:**
- Final match completed
- Final has a winner

**Actions:**
- Automatically triggered when final completes
- Sets `championTeam` and `runnerUp`
- Records `endDate`
- Sets `currentStage = 'completed'`

---

## Match Simulation Validation

Before allowing a match to be simulated, the system checks:

### 1. Match Exists
```javascript
const match = await Match.findOne({ id: matchId });
if (!match) return { allowed: false, reason: 'Match not found' };
```

### 2. Match Not Already Completed
```javascript
if (match.status === 'completed') {
  return { allowed: false, reason: 'Match already completed' };
}
```

### 3. Correct Tournament Stage
```javascript
// Can only simulate matches in current stage
if (match.roundStage !== tournamentState.currentStage) {
  return { 
    allowed: false, 
    reason: `Cannot simulate ${match.roundStage} match. Current stage is ${currentStage}` 
  };
}
```

### 4. Teams Are Set (Not TBD)
```javascript
if (match.homeTeam === 'TBD' || match.awayTeam === 'TBD') {
  return { 
    allowed: false, 
    reason: 'Match teams not yet determined. Previous round must complete.' 
  };
}
```

### 5. Previous Round Complete
```javascript
// For semi-finals
if (match.roundStage === 'semi' && !metadata.quarterFinalsCompleted) {
  return { 
    allowed: false, 
    reason: 'All quarter-finals must be completed first' 
  };
}

// For final
if (match.roundStage === 'final' && !metadata.semiFinalsCompleted) {
  return { 
    allowed: false, 
    reason: 'All semi-finals must be completed first' 
  };
}
```

---

## API Updates

### GET `/api/tournament/bracket`

Enhanced to include team details via query parameter.

**Without Team Details:**
```bash
GET /api/tournament/bracket
```

**Response:**
```json
{
  "success": true,
  "tournamentState": {
    "currentStage": "quarter",
    "startDate": "2024-01-20T10:00:00Z",
    "endDate": null,
    "winner": null,
    "totalMatches": 7,
    "completedMatches": 2,
    "metadata": {
      "quarterFinalsCompleted": false,
      "semiFinalsCompleted": false,
      "finalCompleted": false
    }
  },
  "quarterFinals": [...],
  "semiFinals": [...],
  "final": {...}
}
```

**With Team Details:**
```bash
GET /api/tournament/bracket?includeTeams=true
```

**Response includes:**
```json
{
  "quarterFinals": [
    {
      "id": "match_quarter1_...",
      "homeTeam": "Nigeria",
      "awayTeam": "Ghana",
      "homeTeamDetails": {
        "country": "Nigeria",
        "federation": "CAF",
        "manager": "José Peseiro",
        "rating": 85
      },
      "awayTeamDetails": {
        "country": "Ghana",
        "federation": "CAF",
        "manager": "Chris Hughton",
        "rating": 82
      },
      "homeScore": 2,
      "awayScore": 1,
      "winner": "Nigeria",
      "status": "completed"
    }
  ]
}
```

### POST `/api/matches/simulate`

Enhanced with stage validation.

**Request:**
```json
{
  "matchId": "match_quarter1_..."
}
```

**Success Response (with stage transition):**
```json
{
  "success": true,
  "data": {
    "id": "match_quarter1_...",
    "homeTeam": "Nigeria",
    "homeScore": 2,
    "awayScore": 1,
    "winner": "Nigeria",
    "status": "completed"
  },
  "advancement": {
    "success": true,
    "message": "Winner Nigeria advanced to Semi Final",
    "nextMatch": {...},
    "stageTransition": {
      "from": "quarter",
      "to": "semi",
      "message": "All quarter matches completed. Advanced to next stage."
    }
  },
  "message": "Match simulated successfully. Winner advanced to Semi Final."
}
```

**Error Response (out of order):**
```json
{
  "success": false,
  "error": "Match simulation not allowed",
  "reason": "Cannot simulate semi match. Current stage is quarter",
  "currentStage": "quarter"
}
```

**Error Response (teams not set):**
```json
{
  "success": false,
  "error": "Match simulation not allowed",
  "reason": "Match teams not yet determined. Previous round matches must be completed.",
  "currentStage": "semi"
}
```

**Tournament Completion Response:**
```json
{
  "success": true,
  "data": {...},
  "tournamentCompleted": {
    "completed": true,
    "champion": "Nigeria",
    "runnerUp": "Senegal",
    "startDate": "2024-01-20T10:00:00Z",
    "endDate": "2024-01-30T18:00:00Z"
  },
  "message": "Match simulated successfully. 🏆 Tournament completed! Champion: Nigeria!"
}
```

### POST `/api/tournament/start`

Enhanced to check and update tournament state.

**Response:**
```json
{
  "success": true,
  "message": "Tournament bracket initialized successfully",
  "tournamentState": {
    "currentStage": "quarter",
    "startDate": "2024-01-20T10:00:00Z",
    "totalMatches": 7,
    "participatingTeams": ["Nigeria", "Ghana", "Senegal", ...]
  },
  "bracket": {...}
}
```

### POST `/api/tournament/restart`

Enhanced to reset tournament state.

**Response:**
```json
{
  "success": true,
  "message": "Tournament has been restarted successfully",
  "deletedMatches": 7,
  "tournamentState": {
    "currentStage": "registration"
  }
}
```

---

## Workflow Examples

### Complete Tournament Flow

#### 1. Start Tournament
```bash
POST /api/tournament/start
Authorization: Bearer <admin_token>
```
**Result:** Tournament state → `quarter`, 7 matches created

#### 2. Check Current State
```bash
GET /api/tournament/bracket?includeTeams=true
```
**Result:** See all matches, current stage, team details

#### 3. Simulate First Quarter-Final
```bash
POST /api/matches/simulate
Body: { "matchId": "match_quarter1_..." }
```
**Result:** Match completes, winner advances to semi-final

#### 4. Try to Simulate Semi-Final (will fail)
```bash
POST /api/matches/simulate
Body: { "matchId": "match_semi1_..." }
```
**Result:** Error - "Cannot simulate semi match. Current stage is quarter"

#### 5. Complete All Quarter-Finals
```bash
# Simulate remaining 3 quarter-finals
POST /api/matches/simulate (matchId: quarter2)
POST /api/matches/simulate (matchId: quarter3)
POST /api/matches/simulate (matchId: quarter4)
```
**Result:** After 4th QF completes:
- Stage automatically transitions to `semi`
- Semi-finals now have both teams set
- Semi-finals status changes to `scheduled`

#### 6. Check Bracket After Stage Transition
```bash
GET /api/tournament/bracket
```
**Result:**
```json
{
  "tournamentState": {
    "currentStage": "semi",
    "completedMatches": 4,
    "metadata": {
      "quarterFinalsCompleted": true,
      "semiFinalsCompleted": false
    }
  },
  "semiFinals": [
    {
      "homeTeam": "Nigeria",
      "awayTeam": "Senegal",
      "status": "scheduled"
    }
  ]
}
```

#### 7. Simulate Semi-Finals
```bash
POST /api/matches/simulate (matchId: semi1)
POST /api/matches/simulate (matchId: semi2)
```
**Result:** After 2nd SF completes:
- Stage transitions to `final`
- Final match has both teams set

#### 8. Simulate Final
```bash
POST /api/matches/simulate (matchId: final)
```
**Result:**
- Tournament state → `completed`
- Champion and runner-up recorded
- End date recorded

---

## Validation Error Messages

| Scenario | Error Message |
|----------|--------------|
| Match not found | `Match not found` |
| Already completed | `Match already completed` |
| Wrong stage | `Cannot simulate {stage} match. Current stage is {currentStage}` |
| Teams TBD | `Match teams not yet determined. Previous round matches must be completed.` |
| QFs not complete | `All quarter-final matches must be completed before simulating semi-finals` |
| SFs not complete | `All semi-final matches must be completed before simulating the final` |

---

## Database Queries

### Get Tournament State
```javascript
const tournamentState = await TournamentState.getCurrent();
```

### Check if Round Complete
```javascript
const isComplete = await tournamentState.isCurrentRoundComplete();
```

### Validate Match Can Be Simulated
```javascript
const canSimulate = await tournamentState.canSimulateMatch(matchId);
if (!canSimulate.allowed) {
  console.log(canSimulate.reason);
}
```

### Get Bracket with Team Details
```javascript
const bracket = await getBracketState(true); // includeTeamDetails = true
```

---

## Model Methods

### Static Methods

#### `TournamentState.getCurrent()`
Returns current tournament state, creates if doesn't exist.

```javascript
const tournament = await TournamentState.getCurrent();
console.log(tournament.currentStage); // 'quarter'
```

### Instance Methods

#### `canStartStage(stage)`
Checks if specified stage can be started.

```javascript
const canStart = tournament.canStartStage('semi');
// Returns true only if current stage is 'quarter'
```

#### `isCurrentRoundComplete()`
Checks if all matches in current round are completed.

```javascript
const complete = await tournament.isCurrentRoundComplete();
if (complete) {
  await tournament.advanceStage();
}
```

#### `advanceStage()`
Advances tournament to next stage.

```javascript
// Current: 'quarter'
await tournament.advanceStage();
// Now: 'semi'
```

#### `canSimulateMatch(matchId)`
Comprehensive validation for match simulation.

```javascript
const result = await tournament.canSimulateMatch('match_semi1_...');
if (!result.allowed) {
  console.log(result.reason);
  // "All quarter-finals must be completed first"
}
```

---

## Testing

### Test Stage Progression
```powershell
# 1. Start tournament
curl -X POST http://localhost:5000/api/tournament/start `
  -H "Authorization: Bearer $TOKEN"

# 2. Check stage
curl http://localhost:5000/api/tournament/bracket
# currentStage: "quarter"

# 3. Complete all QFs
curl -X POST http://localhost:5000/api/matches/simulate `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"matchId":"match_quarter1_..."}'

# Repeat for all 4 quarter-finals

# 4. Check stage after 4th QF
curl http://localhost:5000/api/tournament/bracket
# currentStage: "semi" (automatically transitioned!)
```

### Test Validation
```powershell
# Try to simulate semi-final during quarter stage
curl -X POST http://localhost:5000/api/matches/simulate `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"matchId":"match_semi1_..."}'

# Expected: Error 400
# "Cannot simulate semi match. Current stage is quarter"
```

---

## Architecture Benefits

### 1. **Enforced Progression**
Cannot skip stages or simulate matches out of order.

### 2. **Automatic Transitions**
No manual stage advancement needed - happens automatically when round completes.

### 3. **Single Source of Truth**
TournamentState document tracks entire tournament status.

### 4. **Comprehensive Validation**
Multiple validation layers prevent invalid state transitions.

### 5. **Rich Team Information**
Optional team details provide full context in bracket view.

### 6. **Audit Trail**
Start date, end date, and stage transitions tracked.

---

## Migration from Old System

### Before (Match-Only System)
- Only Match documents
- No overall tournament state
- Could simulate any match anytime
- No stage enforcement

### After (TournamentState System)
- TournamentState + Match documents
- Centralized tournament status
- Stage-based validation
- Automatic transitions
- Round completion checks

### Backward Compatibility
All existing endpoints still work. New validations are additive.

---

## Summary

The TournamentState system provides:
- ✅ Stage-based tournament progression
- ✅ Round completion enforcement
- ✅ Automatic stage transitions
- ✅ Comprehensive validation
- ✅ Team details in bracket
- ✅ Tournament lifecycle tracking

It ensures tournament integrity by preventing out-of-order match simulation and providing a clear, auditable progression through tournament stages.

