# Tournament State System - Quick Reference

## Stage Flow
```
registration → quarter → semi → final → completed
```

## Key Endpoints

### Get Bracket (with team details)
```bash
GET /api/tournament/bracket?includeTeams=true
```

### Start Tournament
```bash
POST /api/tournament/start
Headers: Authorization: Bearer <token>
```
→ Creates TournamentState + all 7 matches  
→ Sets stage to `quarter`

### Simulate Match (with validation)
```bash
POST /api/matches/simulate
Headers: Authorization: Bearer <token>
Body: { "matchId": "match_quarter1_..." }
```
→ Validates current stage  
→ Checks round completion  
→ Auto-advances winner  
→ Auto-transitions stage when round completes

### Restart Tournament
```bash
POST /api/tournament/restart
Headers: Authorization: Bearer <token>
```
→ Deletes all matches  
→ Resets state to `registration`

## Validation Rules

| Action | Requires |
|--------|----------|
| Simulate QF | Stage = `quarter` |
| Simulate SF | Stage = `semi`, all QFs completed |
| Simulate Final | Stage = `final`, all SFs completed |

## Automatic Transitions

- After 4th QF completes → Stage = `semi`
- After 2nd SF completes → Stage = `final`  
- After Final completes → Stage = `completed`, champion recorded

## Error Messages

| Error | Meaning |
|-------|---------|
| `Cannot simulate semi match. Current stage is quarter` | Must complete all QFs first |
| `Match teams not yet determined` | Previous round winners not set yet |
| `All quarter-finals must be completed first` | Round not finished |

## Tournament State Fields

```javascript
{
  currentStage: "quarter" | "semi" | "final" | "completed",
  startDate: Date,
  endDate: Date,
  winner: "Nigeria",
  runnerUp: "Senegal",
  totalMatches: 7,
  completedMatches: 4,
  metadata: {
    quarterFinalsCompleted: true,
    semiFinalsCompleted: false,
    finalCompleted: false
  }
}
```

## Test Commands

```powershell
# Run complete test
.\test-tournament-state.ps1

# Or manually:
$TOKEN = "..." # Get from login

# Start
curl -X POST http://localhost:5000/api/tournament/start -H "Authorization: Bearer $TOKEN"

# Get bracket with teams
curl "http://localhost:5000/api/tournament/bracket?includeTeams=true"

# Simulate match
curl -X POST http://localhost:5000/api/matches/simulate `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"matchId":"match_quarter1_..."}'
```

## Model Methods

```javascript
// Get current tournament
const tournament = await TournamentState.getCurrent();

// Check if can simulate
const canSim = await tournament.canSimulateMatch(matchId);
if (!canSim.allowed) {
  console.log(canSim.reason);
}

// Check round complete
const complete = await tournament.isCurrentRoundComplete();

// Advance stage
await tournament.advanceStage();
```

## Response with Stage Transition

```json
{
  "success": true,
  "data": { "winner": "Nigeria", ... },
  "advancement": {
    "message": "Winner advanced to Semi Final",
    "stageTransition": {
      "message": "All quarter matches completed. Advanced to next stage."
    }
  }
}
```

## Response with Tournament Completion

```json
{
  "success": true,
  "tournamentCompleted": {
    "completed": true,
    "champion": "Nigeria",
    "runnerUp": "Senegal"
  },
  "message": "🏆 Tournament completed! Champion: Nigeria!"
}
```

