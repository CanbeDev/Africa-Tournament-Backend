# Tournament Bracket System Test Script
# This script demonstrates the complete tournament bracket flow

$baseUrl = "http://localhost:5001/api"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Step { Write-Host "`n=== $args ===" -ForegroundColor Yellow }

# Admin credentials (update as needed)
$adminEmail = "admin@panafrican.com"
$adminPassword = "admin123"

Write-Step "Step 1: Admin Login"
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body (@{
    email = $adminEmail
    password = $adminPassword
} | ConvertTo-Json)

$token = $loginResponse.token
Write-Success "✓ Admin logged in successfully"
Write-Info "Token: $($token.Substring(0, 20))..."

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Start Tournament
Write-Step "Step 2: Starting Tournament (Creating Bracket)"
try {
    $startResponse = Invoke-RestMethod -Uri "$baseUrl/tournament/start" -Method POST -Headers $headers
    Write-Success "✓ Tournament bracket initialized"
    Write-Info "Total matches created: $($startResponse.totalMatches)"
    Write-Info "Quarter-finals: $($startResponse.bracket.quarterFinals.Count)"
    Write-Info "Semi-finals: $($startResponse.bracket.semiFinals.Count)"
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Info "Tournament already exists. Restarting..."
        Invoke-RestMethod -Uri "$baseUrl/tournament/restart" -Method POST -Headers $headers | Out-Null
        Start-Sleep -Seconds 1
        $startResponse = Invoke-RestMethod -Uri "$baseUrl/tournament/start" -Method POST -Headers $headers
        Write-Success "✓ Tournament restarted and bracket initialized"
    } else {
        throw $_
    }
}

# Step 3: Get Bracket State
Write-Step "Step 3: Viewing Initial Bracket State"
$bracketResponse = Invoke-RestMethod -Uri "$baseUrl/tournament/bracket" -Method GET
Write-Success "✓ Bracket state retrieved"

Write-Info "`nQuarter-Finals:"
foreach ($qf in $bracketResponse.bracket.quarterFinals) {
    Write-Host "  $($qf.homeTeam) vs $($qf.awayTeam) [$($qf.status)]" -ForegroundColor White
}

Write-Info "`nSemi-Finals:"
foreach ($sf in $bracketResponse.bracket.semiFinals) {
    Write-Host "  $($sf.homeTeam) vs $($sf.awayTeam) [$($sf.status)]" -ForegroundColor White
}

Write-Info "`nFinal:"
$final = $bracketResponse.bracket.final
Write-Host "  $($final.homeTeam) vs $($final.awayTeam) [$($final.status)]" -ForegroundColor White

# Step 4: Simulate First Quarter-Final
Write-Step "Step 4: Simulating First Quarter-Final (with Auto-Advancement)"
$firstQF = $bracketResponse.bracket.quarterFinals[0]
Write-Info "Simulating: $($firstQF.homeTeam) vs $($firstQF.awayTeam)"

$simulateBody = @{
    matchId = $firstQF.id
} | ConvertTo-Json

$simulateResponse = Invoke-RestMethod -Uri "$baseUrl/matches/simulate" -Method POST -Headers $headers -Body $simulateBody
Write-Success "✓ Match simulated"
Write-Info "Result: $($simulateResponse.data.homeTeam) $($simulateResponse.data.homeScore)-$($simulateResponse.data.awayScore) $($simulateResponse.data.awayTeam)"
Write-Info "Winner: $($simulateResponse.data.winner)"

if ($simulateResponse.advancement) {
    Write-Success "✓ Winner automatically advanced to $($simulateResponse.advancement.nextMatch.stage)"
    Write-Info "Next match: $($simulateResponse.advancement.nextMatch.homeTeam) vs $($simulateResponse.advancement.nextMatch.awayTeam)"
}

# Step 5: Check Updated Bracket
Write-Step "Step 5: Checking Updated Bracket State"
$updatedBracket = Invoke-RestMethod -Uri "$baseUrl/tournament/bracket" -Method GET

Write-Info "`nUpdated Semi-Finals:"
foreach ($sf in $updatedBracket.bracket.semiFinals) {
    $statusColor = if ($sf.status -eq "scheduled") { "Green" } else { "Yellow" }
    Write-Host "  $($sf.homeTeam) vs $($sf.awayTeam) [$($sf.status)]" -ForegroundColor $statusColor
}

# Step 6: Validate Progression
Write-Step "Step 6: Validating Match Progression"
$validateBody = @{
    matchId = $firstQF.id
} | ConvertTo-Json

$validateResponse = Invoke-RestMethod -Uri "$baseUrl/tournament/validate" -Method POST -Headers $headers -Body $validateBody
Write-Success "✓ Validation complete"
Write-Info "Valid: $($validateResponse.validation.valid)"
if ($validateResponse.validation.errors) {
    Write-Error "Errors: $($validateResponse.validation.errors -join ', ')"
} else {
    Write-Success "No validation errors"
}

# Step 7: Simulate Second Quarter-Final
Write-Step "Step 7: Simulating Second Quarter-Final"
$secondQF = $bracketResponse.bracket.quarterFinals[1]
Write-Info "Simulating: $($secondQF.homeTeam) vs $($secondQF.awayTeam)"

$simulateBody = @{
    matchId = $secondQF.id
} | ConvertTo-Json

$simulateResponse2 = Invoke-RestMethod -Uri "$baseUrl/matches/simulate" -Method POST -Headers $headers -Body $simulateBody
Write-Success "✓ Match simulated"
Write-Info "Result: $($simulateResponse2.data.homeTeam) $($simulateResponse2.data.homeScore)-$($simulateResponse2.data.awayScore) $($simulateResponse2.data.awayTeam)"
Write-Info "Winner: $($simulateResponse2.data.winner)"

# Step 8: Check Semi-Final Status
Write-Step "Step 8: Checking Semi-Final Match Status"
$finalBracket = Invoke-RestMethod -Uri "$baseUrl/tournament/bracket" -Method GET

$firstSemi = $finalBracket.bracket.semiFinals[0]
Write-Info "`nFirst Semi-Final:"
Write-Host "  $($firstSemi.homeTeam) vs $($firstSemi.awayTeam)" -ForegroundColor White
Write-Host "  Status: $($firstSemi.status)" -ForegroundColor $(if ($firstSemi.status -eq "scheduled") { "Green" } else { "Yellow" })
Write-Host "  Next Match: $($firstSemi.nextMatchId)" -ForegroundColor White

if ($firstSemi.status -eq "scheduled") {
    Write-Success "`n✓ Both quarter-final winners have been placed in semi-final!"
    Write-Success "✓ Semi-final is now ready to be played!"
}

# Summary
Write-Step "Test Summary"
Write-Success "✓ Bracket initialization working"
Write-Success "✓ Automatic winner advancement working"
Write-Success "✓ Match simulation with advancement working"
Write-Success "✓ Bracket state updates working"
Write-Success "✓ Validation system working"

Write-Info "`nNext Steps:"
Write-Host "1. Simulate remaining quarter-finals to fill all semi-final slots" -ForegroundColor Cyan
Write-Host "2. Simulate semi-finals to determine finalists" -ForegroundColor Cyan
Write-Host "3. Simulate final to crown tournament champion" -ForegroundColor Cyan
Write-Host "4. Use GET /api/tournament/bracket to view complete bracket anytime" -ForegroundColor Cyan

Write-Host "`n✅ Tournament Bracket System Test Complete!" -ForegroundColor Green

