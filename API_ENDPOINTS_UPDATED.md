# Pan African Kicks API - Complete Endpoints List (Updated with Authentication)

**Base URL:** `http://localhost:5000/api`

---

## Authentication Endpoints

### POST `/api/auth/register`
**Description:** Register a new user (Admin or Federation Representative)  
**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securepassword",
  "role": "admin",
  "name": "Admin Name" // Optional for admin, required for federation_rep
}
```
**For Federation Rep:**
```json
{
  "email": "rep@federation.com",
  "password": "securepassword",
  "role": "federation_rep",
  "name": "José Peseiro",
  "country": "Nigeria",
  "federation": "Nigerian Football Federation"
}
```
**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_123...",
    "email": "admin@example.com",
    "role": "admin",
    "name": "Admin Name",
    "createdAt": "..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST `/api/auth/login`
**Description:** Login and receive JWT token  
**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securepassword"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {...},
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET `/api/auth/me`
**Description:** Get currently logged-in user details (Protected)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123...",
    "email": "admin@example.com",
    "role": "admin",
    "name": "Admin Name"
  }
}
```

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
**Description:** Get all teams (public)  
**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 8
}
```

### GET `/api/teams/activity`
**Description:** Get 5 most recently registered/updated teams (public)  
**Response:**
```json
[
  {
    "id": 1,
    "name": "Egypt",
    "flagUrl": "🇪🇬"
  }
]
```

### GET `/api/teams/registered`
**Description:** Get all registered teams (public)  
**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 2
}
```

### GET `/api/teams/group/:group`
**Description:** Get teams by group (public)  
**Params:** `group` - Group letter (A, B, C, or D)

### GET `/api/teams/:id`
**Description:** Get specific team by ID (public)  
**Params:** `id` - Team ID (number or string)

### POST `/api/teams/register`
**Description:** Register a new team (Federation Rep only)  
**Headers:** `Authorization: Bearer <token>`  
**Required Role:** `federation_rep`  
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
**Response (201):**
```json
{
  "id": "team_123...",
  "federation": "Nigerian Football Federation",
  "country": "Nigeria",
  "manager": "José Peseiro",
  "rating": 67.5,
  "players": [...],
  "createdAt": "..."
}
```

---

## Matches Endpoints

### GET `/api/matches`
**Description:** Get all matches (public)  
**Query Parameters:**
- `status` (optional): Filter by status
- `group` (optional): Filter by group

### GET `/api/matches/recent`
**Description:** Get 5 most recent completed matches (public)

### GET `/api/matches/live`
**Description:** Get currently live/active matches (public)  
**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 2
}
```

### GET `/api/matches/:id`
**Description:** Get specific match by ID (public)

### POST `/api/matches/simulate`
**Description:** Simulate a match (Admin only)  
**Headers:** `Authorization: Bearer <token>`  
**Required Role:** `admin`  
**Request Body (Option 1 - with matchId):**
```json
{
  "matchId": 1
}
```
**Request Body (Option 2 - new match):**
```json
{
  "homeTeam": "Egypt",
  "awayTeam": "Nigeria"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "homeTeam": "Egypt",
    "awayTeam": "Nigeria",
    "homeScore": 2,
    "awayScore": 1,
    "status": "completed",
    "winner": "Egypt"
  },
  "message": "Match simulated successfully"
}
```

---

## Tournament Endpoints

### GET `/api/tournament/status`
**Description:** Get tournament status (public)

### GET `/api/tournament/stats`
**Description:** Get tournament statistics (public)

### GET `/api/tournament/top-scorers`
**Description:** Get top goal scorers (public)  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "L. Messi",
      "goals": 9,
      "team": "Nigeria",
      "assists": 3
    },
    ...
  ],
  "count": 10
}
```

### POST `/api/tournament/start`
**Description:** Start the tournament - generate quarter-final matches (Admin only)  
**Headers:** `Authorization: Bearer <token>`  
**Required Role:** `admin`  
**Response:**
```json
{
  "success": true,
  "message": "Tournament started successfully",
  "matches": [
    {
      "id": 1,
      "homeTeam": "Nigeria",
      "awayTeam": "Senegal",
      "status": "scheduled",
      "date": "...",
      "stage": "quarter"
    },
    ...
  ],
  "count": 4,
  "timestamp": "..."
}
```

### POST `/api/tournament/restart`
**Description:** Restart the tournament (Admin only)  
**Headers:** `Authorization: Bearer <token>`  
**Required Role:** `admin`  
**Response:**
```json
{
  "success": true,
  "message": "Tournament has been restarted successfully",
  "timestamp": "..."
}
```

---

## Summary

### Total Endpoints: 18

**Authentication (3):**
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`

**Health Check (1):**
- GET `/api/health`

**Teams (6):**
- GET `/api/teams`
- GET `/api/teams/activity`
- GET `/api/teams/registered`
- GET `/api/teams/group/:group`
- GET `/api/teams/:id`
- POST `/api/teams/register` (Federation Rep only)

**Matches (5):**
- GET `/api/matches`
- GET `/api/matches/recent`
- GET `/api/matches/live` ✨ NEW
- GET `/api/matches/:id`
- POST `/api/matches/simulate` (Admin only) ✨ UPDATED (accepts matchId)

**Tournament (5):**
- GET `/api/tournament/status`
- GET `/api/tournament/stats`
- GET `/api/tournament/top-scorers` ✨ NEW
- POST `/api/tournament/start` ✨ NEW (Admin only)
- POST `/api/tournament/restart` (Admin only) ✨ SECURED

---

## Authentication & Authorization

### How to Use JWT Tokens

1. **Register/Login** to get a token
2. **Include token** in Authorization header for protected routes:
   ```
   Authorization: Bearer <your-token>
   ```
3. **Token expires** in 7 days

### Role-Based Access

- **Admin**: Can simulate matches, start/restart tournament
- **Federation Rep**: Can register teams for their federation
- **Public**: Can view teams, matches, tournament stats

### Protected Routes

- POST `/api/teams/register` - Requires `federation_rep` role
- POST `/api/matches/simulate` - Requires `admin` role
- POST `/api/tournament/start` - Requires `admin` role
- POST `/api/tournament/restart` - Requires `admin` role
- GET `/api/auth/me` - Requires authentication (any role)

---

## Notes

- All data is stored in **memory** (no database connection)
- Data is **lost on server restart**
- JWT secret is set via `JWT_SECRET` environment variable (default: 'your-secret-key-change-in-production')
- Password hashing uses bcrypt with 10 salt rounds
- Token expiration: 7 days

