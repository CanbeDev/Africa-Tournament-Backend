# PowerShell test script to verify endpoints work
# Run this while server is running

Write-Host "Step 1: Register a new team..." -ForegroundColor Cyan

$body = Get-Content -Path "test-request.json" -Raw

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/teams/register" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "✅ Team registered successfully!" -ForegroundColor Green
    Write-Host "Team ID: $($registerResponse.id)" -ForegroundColor Yellow
    Write-Host "Country: $($registerResponse.country)" -ForegroundColor Yellow
    Write-Host "Rating: $($registerResponse.rating)" -ForegroundColor Yellow
    Write-Host ""
    
    $teamId = $registerResponse.id
    
    Write-Host "Step 2: Get all registered teams..." -ForegroundColor Cyan
    $registeredTeams = Invoke-RestMethod -Uri "http://localhost:5000/api/teams/registered"
    Write-Host "✅ Found $($registeredTeams.count) registered team(s)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Step 3: Get specific team by ID..." -ForegroundColor Cyan
    $team = Invoke-RestMethod -Uri "http://localhost:5000/api/teams/$teamId"
    Write-Host "✅ Team retrieved successfully!" -ForegroundColor Green
    Write-Host "Team ID: $($team.data.id)" -ForegroundColor Yellow
    Write-Host "Federation: $($team.data.federation)" -ForegroundColor Yellow
    Write-Host "Players: $($team.data.players.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "✅ All endpoints working correctly!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

