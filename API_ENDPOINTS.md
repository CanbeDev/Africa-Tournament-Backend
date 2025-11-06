# Pan African Kicks API - Complete Endpoints List

**Base URL:** `http://localhost:5000/api`

---

## Health Check

### GET `/api/health`
**Description:** Health check endpoint  
**Response:**
```json
{
  "status": "OK",
  "message": "Pan African Kicks API is running",
  "timestamp": "2025-01-31T10:00:00.000Z"
}
```

---

## Teams Endpoints

### GET `/api/teams`
**Description:** Get all teams (includes both mock teams and registered teams)  
**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 8
}
```

### GET `/api/teams/activity`
**Description:** Get 5 most recently registered/updated teams  
**Response:**
```json
[
  {
    "id": 1,
    "name": "Egypt",
    "flagUrl": "🇪🇬"
  },
  ...
]
```

### GET `/api/teams/registered`
**Description:** Get all registered teams (filtered by string IDs starting with 'team_')  
**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 2
}
```

### GET `/api/teams/group/:group`
**Description:** Get teams by group (A, B, C, D)  
**Params:** `group` - Group letter (A, B, C, or D)  
**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 2,
  "group": "A"
}
```

### GET `/api/teams/:id`
**Description:** Get specific team by ID (supports both numeric IDs for mock teams and string IDs for registered teams)  
**Params:** `id` - Team ID (number or string)  
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "team_123...",
    "federation": "...",
    "country": "...",
    "manager": "...",
    "rating": 67.5,
    "players": [...],
    "createdAt": "..."
  }
}
```

### POST `/api/teams/register`
**Description:** Register a new team with 23 players  
**Request Body:**
```json
{
  "federation": "Nigerian Football Federation",
  "country": "Nigeria",
  "manager": "José Peseiro",
  "players": [
    {
      "name": "Victor Osimhen",
      "position": "AT",
      "isCaptain": true
    },
    ...
  ]
}
```
**Validation Rules:**
- Must have exactly 23 players
- Must have at least 1 GK, 3 DF, 3 MD, 1 AT
- Exactly 1 captain required
- Country must be from Africa
- Each player must have: name, position (GK/DF/MD/AT), isCaptain (boolean)

**Response (201 Created):**
```json
{
  "id": "team_1761924417143_37gb4t2i6",
  "federation": "Nigerian Football Federation",
  "country": "Nigeria",
  "manager": "José Peseiro",
  "rating": 67.5,
  "players": [
    {
      "name": "Victor Osimhen",
      "naturalPosition": "AT",
      "isCaptain": true,
      "ratings": {
        "GK": 15,
        "DF": 25,
        "MD": 40,
        "AT": 85
      }
    },
    ...
  ],
  "createdAt": "2025-01-31T10:00:00.000Z"
}
```

---

## Matches Endpoints

### GET `/api/matches`
**Description:** Get all matches (with optional filters)  
**Query Parameters:**
- `status` (optional): Filter by status (e.g., "completed", "upcoming")
- `group` (optional): Filter by group

**Example:** `GET /api/matches?status=completed&group=A`

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

### GET `/api/matches/recent`
**Description:** Get 5 most recent completed matches  
**Response:**
```json
[
  {
    "id": 1,
    "homeTeam": "Egypt",
    "awayTeam": "Algeria",
    "homeScore": 2,
    "awayScore": 1,
    "status": "completed",
    "date": "2024-01-15T15:00:00Z",
    "group": "A"
  },
  ...
]
```

### GET `/api/matches/:id`
**Description:** Get specific match by ID  
**Params:** `id` - Match ID (number)  
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "homeTeam": "Egypt",
    "awayTeam": "Algeria",
    "homeScore": 2,
    "awayScore": 1,
    "status": "completed",
    "date": "2024-01-15T15:00:00Z",
    "group": "A"
  }
}
```

### POST `/api/matches/simulate`
**Description:** Simulate a match between two teams  
**Request Body:**
```json
{
  "homeTeam": "Egypt",
  "awayTeam": "Algeria"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "homeTeam": "Egypt",
    "awayTeam": "Algeria",
    "homeScore": 2,
    "awayScore": 1,
    "status": "completed",
    "date": "2025-01-31T10:00:00.000Z",
    "winner": "Egypt"
  },
  "message": "Match simulated successfully"
}
```

---

## Tournament Endpoints

### GET `/api/tournament/status`
**Description:** Get tournament status and overview  
**Response:**
```json
{
  "status": "active",
  "teamsCount": 8,
  "matchesPlayed": 4,
  "totalGoals": 45,
  "yellowCards": 23,
  "redCards": 5,
  "currentPhase": "Quarter Finals"
}
```

### GET `/api/tournament/stats`
**Description:** Get tournament statistics  
**Response:**
```json
{
  "totalMatches": 120,
  "totalGoals": 345,
  "activeFederations": 32,
  "topScorer": {
    "name": "L. Messi",
    "goals": 9
  }
}
```

### POST `/api/tournament/restart`
**Description:** Restart the tournament (resets data in production)  
**Response:**
```json
{
  "success": true,
  "message": "Tournament has been restarted successfully",
  "timestamp": "2025-01-31T10:00:00.000Z"
}
```

---

## Summary

### Total Endpoints: 14

**Teams (6):**
- GET `/api/teams`
- GET `/api/teams/activity`
- GET `/api/teams/registered`
- GET `/api/teams/group/:group`
- GET `/api/teams/:id`
- POST `/api/teams/register`

**Matches (4):**
- GET `/api/matches`
- GET `/api/matches/recent`
- GET `/api/matches/:id`
- POST `/api/matches/simulate`

**Tournament (3):**
- GET `/api/tournament/status`
- GET `/api/tournament/stats`
- POST `/api/tournament/restart`

**System (1):**
- GET `/api/health`

---

## Notes

- All data is stored in **memory** (no database connection)
- Data is **lost on server restart**
- All endpoints return JSON
- Error responses follow: `{"success": false, "error": "message"}`
- Success responses follow: `{"success": true, "data": ...}`
- Base URL can be changed via `FRONTEND_URL` environment variable (default: `http://localhost:8080`)
- Server port can be changed via `PORT` environment variable (default: `5000`)

