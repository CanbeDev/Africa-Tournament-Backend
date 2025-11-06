# Tournament Bracket API Endpoints

Quick reference for the tournament bracket progression system.

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/tournament/start` | Admin | Initialize tournament bracket |
| POST | `/api/tournament/restart` | Admin | Reset tournament and delete all bracket matches |
| GET | `/api/tournament/bracket` | Public | Get current bracket state |
| POST | `/api/tournament/advance` | Admin | Manually advance winner to next round |
| POST | `/api/tournament/validate` | Admin | Validate match progression |
| POST | `/api/matches/simulate` | Admin | Simulate match (auto-advances winner) |

---

## POST `/api/tournament/start`

Initialize complete tournament bracket with 8 teams.

**Authentication**: Admin only

**Request**: Empty body

**Response**:
```json
{
  "success": true,
  "message": "Tournament bracket initialized successfully",
  "bracket": {
    "quarterFinals": [
      {
        "id": "match_quarter1_1699123456789_abc123def",
        "homeTeam": "Nigeria",
        "awayTeam": "Ghana",
        "status": "scheduled",
        "date": "2024-01-20T12:00:00.000Z",
        "stage": "Quarter Final",
        "nextMatchId": "match_semi1_1699123456789_xyz456ghi"
      }
      // ... 3 more quarter-finals
    ],
    "semiFinals": [
      {
        "id": "match_semi1_1699123456789_xyz456ghi",
        "homeTeam": "TBD",
        "awayTeam": "TBD",
        "status": "upcoming",
        "date": "2024-01-27T12:00:00.000Z",
        "stage": "Semi Final",
        "nextMatchId": "match_final_1699123456789_final123"
      }
      // ... 1 more semi-final
    ],
    "final": {
      "id": "match_final_1699123456789_final123",
      "homeTeam": "TBD",
      "awayTeam": "TBD",
      "status": "upcoming",
      "date": "2024-01-30T12:00:00.000Z",
      "stage": "Final"
    }
  },
  "totalMatches": 7,
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

**Errors**:
- `400`: Less than 8 teams registered or tournament already exists
- `401`: Unauthorized
- `500`: Server error

---

## GET `/api/tournament/bracket`

Get current state of the entire tournament bracket.

**Authentication**: None (public endpoint)

**Request**: None

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
        "date": "2024-01-20T12:00:00.000Z",
        "nextMatchId": "match_semi1_..."
      }
      // ... more matches
    ],
    "semiFinals": [
      {
        "id": "match_semi1_...",
        "homeTeam": "Nigeria",
        "awayTeam": "Senegal",
        "homeScore": 0,
        "awayScore": 0,
        "winner": null,
        "status": "scheduled",
        "date": "2024-01-27T12:00:00.000Z",
        "nextMatchId": "match_final_..."
      }
      // ... more matches
    ],
    "final": {
      "id": "match_final_...",
      "homeTeam": "TBD",
      "awayTeam": "TBD",
      "homeScore": 0,
      "awayScore": 0,
      "winner": null,
      "status": "upcoming",
      "date": "2024-01-30T12:00:00.000Z"
    }
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

## POST `/api/tournament/advance`

Manually advance a winner to the next round.

**Authentication**: Admin only

**Request Body**:
```json
{
  "matchId": "match_quarter1_1699123456789_abc123def",
  "winnerId": "Nigeria"
}
```

**Response** (Success):
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
    "date": "2024-01-27T12:00:00.000Z"
  },
  "timestamp": "2024-01-20T15:30:00.000Z"
}
```

**Response** (Final Match):
```json
{
  "success": true,
  "message": "This is the final match, no advancement needed",
  "isFinalMatch": true,
  "winner": "Nigeria",
  "timestamp": "2024-01-30T18:00:00.000Z"
}
```

**Errors**:
- `400`: Invalid progression (match not completed, invalid winner, etc.)
- `401`: Unauthorized
- `404`: Match not found
- `500`: Server error

**Validation Errors**:
```json
{
  "success": false,
  "error": "Invalid progression",
  "details": [
    "Match must be completed before advancing",
    "Match must have a winner to advance"
  ],
  "match": {
    "id": "match_quarter1_...",
    "stage": "Quarter Final",
    "roundStage": "quarter",
    "status": "scheduled",
    "winner": null,
    "nextMatchId": "match_semi1_..."
  }
}
```

---

## POST `/api/tournament/validate`

Validate if a match can progress to the next round.

**Authentication**: Admin only

**Request Body**:
```json
{
  "matchId": "match_quarter1_1699123456789_abc123def"
}
```

**Response** (Valid):
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
  },
  "timestamp": "2024-01-20T15:00:00.000Z"
}
```

**Response** (Invalid):
```json
{
  "success": true,
  "validation": {
    "valid": false,
    "errors": [
      "Match must be completed before advancing",
      "Match must have a winner to advance"
    ],
    "match": {
      "id": "match_quarter1_...",
      "stage": "Quarter Final",
      "roundStage": "quarter",
      "status": "scheduled",
      "winner": null,
      "nextMatchId": "match_semi1_..."
    }
  },
  "timestamp": "2024-01-20T15:00:00.000Z"
}
```

---

## POST `/api/matches/simulate`

Simulate a match with **automatic winner advancement** for bracket matches.

**Authentication**: Admin only

**Request Body**:
```json
{
  "matchId": "match_quarter1_1699123456789_abc123def"
}
```

Or create new match:
```json
{
  "homeTeam": "Nigeria",
  "awayTeam": "Ghana",
  "stage": "Quarter Final"
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
    "date": "2024-01-20T15:30:00.000Z",
    "stage": "Quarter Final",
    "goalScorers": [
      {
        "playerName": "V. Osimhen",
        "minute": 23,
        "type": "normal",
        "team": "Nigeria"
      },
      {
        "playerName": "S. Mané",
        "minute": 45,
        "type": "normal",
        "team": "Ghana"
      },
      {
        "playerName": "W. Ndidi",
        "minute": 78,
        "type": "normal",
        "team": "Nigeria"
      }
    ],
    "commentary": [
      {
        "minute": 0,
        "type": "kickoff",
        "description": "The match is underway! Nigeria kicks off against Ghana."
      },
      // ... more commentary events
      {
        "minute": 90,
        "type": "fulltime",
        "description": "Full-time! Nigeria 2 - 1 Ghana. Nigeria wins!"
      }
    ],
    "createdAt": "2024-01-20T15:30:00.000Z"
  },
  "advancement": {
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
      "date": "2024-01-27T12:00:00.000Z"
    }
  },
  "message": "Match simulated successfully. Notifications sent. Winner advanced to Semi Final."
}
```

**Notes**:
- If match has `roundStage`, `winner`, and `nextMatchId`, winner is automatically advanced
- Advancement is non-blocking - simulation succeeds even if advancement fails
- Sends email notifications to federation reps and viewers

---

## POST `/api/tournament/restart`

Reset tournament and delete all bracket matches.

**Authentication**: Admin only

**Request**: Empty body

**Response**:
```json
{
  "success": true,
  "message": "Tournament has been restarted successfully",
  "deletedMatches": 7,
  "timestamp": "2024-01-20T09:00:00.000Z"
}
```

---

## Workflow Examples

### Complete Tournament Flow

1. **Initialize bracket**
```bash
POST /api/tournament/start
```

2. **View bracket**
```bash
GET /api/tournament/bracket
```

3. **Simulate quarter-finals** (automatically advances winners)
```bash
POST /api/matches/simulate
Body: { "matchId": "match_quarter1_..." }
POST /api/matches/simulate
Body: { "matchId": "match_quarter2_..." }
POST /api/matches/simulate
Body: { "matchId": "match_quarter3_..." }
POST /api/matches/simulate
Body: { "matchId": "match_quarter4_..." }
```

4. **Check semi-finals are populated**
```bash
GET /api/tournament/bracket
```

5. **Simulate semi-finals**
```bash
POST /api/matches/simulate
Body: { "matchId": "match_semi1_..." }
POST /api/matches/simulate
Body: { "matchId": "match_semi2_..." }
```

6. **Simulate final**
```bash
POST /api/matches/simulate
Body: { "matchId": "match_final_..." }
```

7. **View champion**
```bash
GET /api/tournament/bracket
# Check final.winner
```

### Manual Advancement (Alternative to Auto)

If you prefer manual control:

1. **Simulate without auto-advance** (non-bracket match)
2. **Manually advance winner**
```bash
POST /api/tournament/advance
Body: {
  "matchId": "match_quarter1_...",
  "winnerId": "Nigeria"
}
```

### Validation Before Advancement

```bash
# Check if match can advance
POST /api/tournament/validate
Body: { "matchId": "match_quarter1_..." }

# If valid, advance
POST /api/tournament/advance
Body: { "matchId": "match_quarter1_...", "winnerId": "Nigeria" }
```

---

## Error Handling

### Common Error Scenarios

**Tournament Already Exists**:
```json
{
  "success": false,
  "error": "Tournament already in progress. Use /restart to clear existing tournament."
}
```

**Insufficient Teams**:
```json
{
  "success": false,
  "error": "At least 8 teams are required to start the tournament. Currently 5 teams registered."
}
```

**Invalid Advancement**:
```json
{
  "success": false,
  "error": "Invalid progression",
  "message": "Match match_quarter1_... is not completed yet (status: scheduled)"
}
```

**Winner Not Participant**:
```json
{
  "success": false,
  "error": "Invalid progression",
  "message": "Winner Morocco is not a participant in match match_quarter1_..."
}
```

**Already Advanced**:
```json
{
  "success": false,
  "error": "Invalid progression",
  "message": "Cannot advance to match match_semi1_... - already completed"
}
```

---

## Testing

Use the provided PowerShell test script:

```powershell
.\test-bracket-system.ps1
```

Or use curl:

```bash
# Login as admin
TOKEN=$(curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@panafrican.com","password":"admin123"}' \
  | jq -r '.token')

# Start tournament
curl -X POST http://localhost:5001/api/tournament/start \
  -H "Authorization: Bearer $TOKEN"

# Get bracket
curl http://localhost:5001/api/tournament/bracket

# Simulate match (auto-advances)
curl -X POST http://localhost:5001/api/matches/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"matchId":"match_quarter1_..."}'
```

