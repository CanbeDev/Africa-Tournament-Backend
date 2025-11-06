# Testing POST /api/teams/register Endpoint

## Prerequisites
1. Make sure the server is running: `npm start` or `npm run dev` in the backend directory
2. The server should be running on `http://localhost:5000`

## Using curl (Windows PowerShell)

### Basic Valid Request

```powershell
curl -X POST http://localhost:5000/api/teams/register `
  -H "Content-Type: application/json" `
  -d '{
    "federation": "Nigerian Football Federation",
    "country": "Nigeria",
    "manager": "José Peseiro",
    "players": [
      {"name": "Victor Osimhen", "position": "AT", "isCaptain": true},
      {"name": "Wilfred Ndidi", "position": "MD", "isCaptain": false},
      {"name": "Alex Iwobi", "position": "MD", "isCaptain": false},
      {"name": "Kelechi Iheanacho", "position": "AT", "isCaptain": false},
      {"name": "Ademola Lookman", "position": "AT", "isCaptain": false},
      {"name": "Moses Simon", "position": "AT", "isCaptain": false},
      {"name": "Samuel Chukwueze", "position": "AT", "isCaptain": false},
      {"name": "Frank Onyeka", "position": "MD", "isCaptain": false},
      {"name": "Joe Aribo", "position": "MD", "isCaptain": false},
      {"name": "Raphael Onyedika", "position": "MD", "isCaptain": false},
      {"name": "Calvin Bassey", "position": "DF", "isCaptain": false},
      {"name": "William Troost-Ekong", "position": "DF", "isCaptain": false},
      {"name": "Leon Balogun", "position": "DF", "isCaptain": false},
      {"name": "Kenneth Omeruo", "position": "DF", "isCaptain": false},
      {"name": "Zaidu Sanusi", "position": "DF", "isCaptain": false},
      {"name": "Ola Aina", "position": "DF", "isCaptain": false},
      {"name": "Bright Osayi-Samuel", "position": "DF", "isCaptain": false},
      {"name": "Francis Uzoho", "position": "GK", "isCaptain": false},
      {"name": "Maduka Okoye", "position": "GK", "isCaptain": false},
      {"name": "Stanley Nwabali", "position": "GK", "isCaptain": false},
      {"name": "Terem Moffi", "position": "AT", "isCaptain": false},
      {"name": "Paul Onuachu", "position": "AT", "isCaptain": false},
      {"name": "Taiwo Awoniyi", "position": "AT", "isCaptain": false}
    ]
  }'
```

### Using Invoke-RestMethod (PowerShell Native - Better for Windows)

```powershell
$body = @{
    federation = "Nigerian Football Federation"
    country = "Nigeria"
    manager = "José Peseiro"
    players = @(
        @{name = "Victor Osimhen"; position = "AT"; isCaptain = $true},
        @{name = "Wilfred Ndidi"; position = "MD"; isCaptain = $false},
        @{name = "Alex Iwobi"; position = "MD"; isCaptain = $false},
        @{name = "Kelechi Iheanacho"; position = "AT"; isCaptain = $false},
        @{name = "Ademola Lookman"; position = "AT"; isCaptain = $false},
        @{name = "Moses Simon"; position = "AT"; isCaptain = $false},
        @{name = "Samuel Chukwueze"; position = "AT"; isCaptain = $false},
        @{name = "Frank Onyeka"; position = "MD"; isCaptain = $false},
        @{name = "Joe Aribo"; position = "MD"; isCaptain = $false},
        @{name = "Raphael Onyedika"; position = "MD"; isCaptain = $false},
        @{name = "Calvin Bassey"; position = "DF"; isCaptain = $false},
        @{name = "William Troost-Ekong"; position = "DF"; isCaptain = $false},
        @{name = "Leon Balogun"; position = "DF"; isCaptain = $false},
        @{name = "Kenneth Omeruo"; position = "DF"; isCaptain = $false},
        @{name = "Zaidu Sanusi"; position = "DF"; isCaptain = $false},
        @{name = "Ola Aina"; position = "DF"; isCaptain = $false},
        @{name = "Bright Osayi-Samuel"; position = "DF"; isCaptain = $false},
        @{name = "Francis Uzoho"; position = "GK"; isCaptain = $false},
        @{name = "Maduka Okoye"; position = "GK"; isCaptain = $false},
        @{name = "Stanley Nwabali"; position = "GK"; isCaptain = $false},
        @{name = "Terem Moffi"; position = "AT"; isCaptain = $false},
        @{name = "Paul Onuachu"; position = "AT"; isCaptain = $false},
        @{name = "Taiwo Awoniyi"; position = "AT"; isCaptain = $false}
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5000/api/teams/register" -Method POST -Body $body -ContentType "application/json"
```

## Using curl (Windows CMD)

If you prefer CMD, save the JSON to a file first:

### Create test-request.json:

```json
{
  "federation": "Nigerian Football Federation",
  "country": "Nigeria",
  "manager": "José Peseiro",
  "players": [
    {"name": "Victor Osimhen", "position": "AT", "isCaptain": true},
    {"name": "Wilfred Ndidi", "position": "MD", "isCaptain": false},
    {"name": "Alex Iwobi", "position": "MD", "isCaptain": false},
    {"name": "Kelechi Iheanacho", "position": "AT", "isCaptain": false},
    {"name": "Ademola Lookman", "position": "AT", "isCaptain": false},
    {"name": "Moses Simon", "position": "AT", "isCaptain": false},
    {"name": "Samuel Chukwueze", "position": "AT", "isCaptain": false},
    {"name": "Frank Onyeka", "position": "MD", "isCaptain": false},
    {"name": "Joe Aribo", "position": "MD", "isCaptain": false},
    {"name": "Raphael Onyedika", "position": "MD", "isCaptain": false},
    {"name": "Calvin Bassey", "position": "DF", "isCaptain": false},
    {"name": "William Troost-Ekong", "position": "DF", "isCaptain": false},
    {"name": "Leon Balogun", "position": "DF", "isCaptain": false},
    {"name": "Kenneth Omeruo", "position": "DF", "isCaptain": false},
    {"name": "Zaidu Sanusi", "position": "DF", "isCaptain": false},
    {"name": "Ola Aina", "position": "DF", "isCaptain": false},
    {"name": "Bright Osayi-Samuel", "position": "DF", "isCaptain": false},
    {"name": "Francis Uzoho", "position": "GK", "isCaptain": false},
    {"name": "Maduka Okoye", "position": "GK", "isCaptain": false},
    {"name": "Stanley Nwabali", "position": "GK", "isCaptain": false},
    {"name": "Terem Moffi", "position": "AT", "isCaptain": false},
    {"name": "Paul Onuachu", "position": "AT", "isCaptain": false},
    {"name": "Taiwo Awoniyi", "position": "AT", "isCaptain": false}
  ]
}
```

Then run:

```cmd
curl -X POST http://localhost:5000/api/teams/register -H "Content-Type: application/json" -d @test-request.json
```

## Testing Validation Errors

### Test: Missing Required Fields

```powershell
curl -X POST http://localhost:5000/api/teams/register -H "Content-Type: application/json" -d '{"federation": "Test"}'
```

### Test: Wrong Player Count (should fail - needs 23 players)

```powershell
curl -X POST http://localhost:5000/api/teams/register -H "Content-Type: application/json" -d '{"federation": "Test", "country": "Nigeria", "manager": "Test Manager", "players": [{"name": "Player 1", "position": "AT", "isCaptain": true}]}'
```

### Test: Invalid Country (should fail - must be African country)

```powershell
curl -X POST http://localhost:5000/api/teams/register -H "Content-Type: application/json" -d '{"federation": "Test", "country": "Brazil", "manager": "Test Manager", "players": []}'
```

### Test: No Captain (should fail - needs exactly 1 captain)

```powershell
curl -X POST http://localhost:5000/api/teams/register -H "Content-Type: application/json" -d '{"federation": "Test", "country": "Nigeria", "manager": "Test Manager", "players": [{"name": "Player 1", "position": "AT", "isCaptain": false}]}'
```

## Expected Response (Success)

```json
{
  "id": "team_1234567890_abc123",
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

## Expected Response (Error)

```json
{
  "success": false,
  "error": "Must have exactly 23 players"
}
```

