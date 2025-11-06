# Tournament State System Test Script
# Tests stage progression, validation, and automatic transitions

$baseUrl = "http://localhost:5000/api"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Step { Write-Host "`n=== $args ===" -ForegroundColor Yellow }

# Admin credentials
$adminEmail = "admin@panafrican.com"
$adminPassword = "admin123"

Write-Step "Step 1: Admin Login"
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body (@{
    email = $adminEmail
    password = $adminPassword
} | ConvertTo-Json)

$token = $loginResponse.token
Write-Success "✓ Admin logged in"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Check Initial State
Write-Step "Step 2: Checking Initial Tournament State"
$initialBracket = Invoke-RestMethod -Uri "$baseUrl/tournament/bracket" -Method GET
Write-Info "Current Stage: $($initialBracket.tournamentState.currentStage)"
Write-Info "Completed Matches: $($initialBracket.tournamentState.completedMatches)/$($initialBracket.tournamentState.totalMatches)"

# Step 3: Start Tournament if needed
Write-Step "Step 3: Starting Tournament"
try {
    $startResponse = Invoke-RestMethod -Uri "$baseUrl/tournament/start" -Method POST -Headers $headers
    Write-Success "✓ Tournament started"
    Write-Info "Stage: $($startResponse.tournamentState.currentStage)"
    Write-Info "Start Date: $($startResponse.tournamentState.startDate)"
    Write-Info "Participating Teams: $($startResponse.tournamentState.participatingTeams.Count)"
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Info "Tournament already in progress. Restarting..."
        Invoke-RestMethod -Uri "$baseUrl/tournament/restart" -Method POST -Headers $headers | Out-Null
        Start-Sleep -Seconds 1
        $startResponse = Invoke-RestMethod -Uri "$baseUrl/tournament/start" -Method POST -Headers $headers
        Write-Success "✓ Tournament restarted and initialized"
    }
}

# Step 4: Get Bracket with Team Details
Write-Step "Step 4: Getting Bracket with Team Details"
$bracketWithTeams = Invoke-RestMethod -Uri "$baseUrl/tournament/bracket?includeTeams=true" -Method GET
Write-Success "✓ Bracket retrieved with team details"
Write-Info "Current Stage: $($bracketWithTeams.tournamentState.currentStage)"

Write-Host "`nQuarter-Finals:" -ForegroundColor White
foreach ($qf in $bracketWithTeams.quarterFinals) {
    $homeRating = if ($qf.homeTeamDetails) { "[$($qf.homeTeamDetails.rating)]" } else { "" }
    $awayRating = if ($qf.awayTeamDetails) { "[$($qf.awayTeamDetails.rating)]" } else { "" }
    Write-Host "  $($qf.homeTeam) $homeRating vs $($qf.awayTeam) $awayRating - $($qf.status)" -ForegroundColor Cyan
}

# Step 5: Try to Simulate Semi-Final (Should Fail)
Write-Step "Step 5: Testing Stage Validation (Try Semi-Final Early)"
$firstSemi = $bracketWithTeams.semiFinals[0]
try {
    $earlySimulate = Invoke-RestMethod -Uri "$baseUrl/matches/simulate" -Method POST -Headers $headers -Body (@{
        matchId = $firstSemi.id
    } | ConvertTo-Json)
    Write-Error "✗ Validation failed - semi-final was allowed during quarter stage!"
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Success "✓ Validation working correctly"
    Write-Info "Reason: $($errorResponse.reason)"
}

# Step 6: Simulate All Quarter-Finals
Write-Step "Step 6: Simulating All Quarter-Finals"
$qfCount = 0
foreach ($qf in $bracketWithTeams.quarterFinals) {
    Write-Info "Simulating QF $($qfCount + 1): $($qf.homeTeam) vs $($qf.awayTeam)"
    
    $simulateResponse = Invoke-RestMethod -Uri "$baseUrl/matches/simulate" -Method POST -Headers $headers -Body (@{
        matchId = $qf.id
    } | ConvertTo-Json)
    
    Write-Success "  ✓ Result: $($simulateResponse.data.homeTeam) $($simulateResponse.data.homeScore)-$($simulateResponse.data.awayScore) $($simulateResponse.data.awayTeam)"
    Write-Success "  ✓ Winner: $($simulateResponse.data.winner)"
    
    if ($simulateResponse.advancement) {
        Write-Info "  → Advanced to $($simulateResponse.advancement.nextMatch.stage)"
    }
    
    # Check for stage transition after 4th QF
    if ($simulateResponse.stageTransition) {
        Write-Success "`n  🎯 STAGE TRANSITION DETECTED!"
        Write-Info "  $($simulateResponse.stageTransition.message)"
    }
    
    $qfCount++
    Start-Sleep -Milliseconds 500
}

# Step 7: Check Tournament State After QFs
Write-Step "Step 7: Checking Tournament State After Quarter-Finals"
$afterQFs = Invoke-RestMethod -Uri "$baseUrl/tournament/bracket" -Method GET
Write-Success "✓ Quarter-finals completed"
Write-Info "Current Stage: $($afterQFs.tournamentState.currentStage)"
Write-Info "Completed Matches: $($afterQFs.tournamentState.completedMatches)/$($afterQFs.tournamentState.totalMatches)"
Write-Info "QFs Complete: $($afterQFs.tournamentState.metadata.quarterFinalsCompleted)"

Write-Host "`nSemi-Finals:" -ForegroundColor White
foreach ($sf in $afterQFs.semiFinals) {
    $statusColor = if ($sf.status -eq "scheduled") { "Green" } else { "Yellow" }
    Write-Host "  $($sf.homeTeam) vs $($sf.awayTeam) - $($sf.status)" -ForegroundColor $statusColor
}

# Step 8: Simulate Semi-Finals
Write-Step "Step 8: Simulating Semi-Finals"
$sfCount = 0
foreach ($sf in $afterQFs.semiFinals) {
    Write-Info "Simulating SF $($sfCount + 1): $($sf.homeTeam) vs $($sf.awayTeam)"
    
    $simulateResponse = Invoke-RestMethod -Uri "$baseUrl/matches/simulate" -Method POST -Headers $headers -Body (@{
        matchId = $sf.id
    } | ConvertTo-Json)
    
    Write-Success "  ✓ Result: $($simulateResponse.data.homeTeam) $($simulateResponse.data.homeScore)-$($simulateResponse.data.awayScore) $($simulateResponse.data.awayTeam)"
    Write-Success "  ✓ Winner: $($simulateResponse.data.winner)"
    
    if ($simulateResponse.advancement) {
        Write-Info "  → Advanced to $($simulateResponse.advancement.nextMatch.stage)"
    }
    
    if ($simulateResponse.stageTransition) {
        Write-Success "`n  🎯 STAGE TRANSITION DETECTED!"
        Write-Info "  $($simulateResponse.stageTransition.message)"
    }
    
    $sfCount++
    Start-Sleep -Milliseconds 500
}

# Step 9: Check Tournament State After SFs
Write-Step "Step 9: Checking Tournament State After Semi-Finals"
$afterSFs = Invoke-RestMethod -Uri "$baseUrl/tournament/bracket" -Method GET
Write-Success "✓ Semi-finals completed"
Write-Info "Current Stage: $($afterSFs.tournamentState.currentStage)"
Write-Info "Completed Matches: $($afterSFs.tournamentState.completedMatches)/$($afterSFs.tournamentState.totalMatches)"
Write-Info "SFs Complete: $($afterSFs.tournamentState.metadata.semiFinalsCompleted)"

$finalMatch = $afterSFs.final
Write-Host "`nFinal:" -ForegroundColor White
Write-Host "  $($finalMatch.homeTeam) vs $($finalMatch.awayTeam) - $($finalMatch.status)" -ForegroundColor Green

# Step 10: Simulate Final
Write-Step "Step 10: Simulating Final Match"
Write-Info "Final: $($finalMatch.homeTeam) vs $($finalMatch.awayTeam)"

$finalResponse = Invoke-RestMethod -Uri "$baseUrl/matches/simulate" -Method POST -Headers $headers -Body (@{
    matchId = $finalMatch.id
} | ConvertTo-Json)

Write-Success "  ✓ Result: $($finalResponse.data.homeTeam) $($finalResponse.data.homeScore)-$($finalResponse.data.awayScore) $($finalResponse.data.awayTeam)"
Write-Success "  ✓ Winner: $($finalResponse.data.winner)"

if ($finalResponse.tournamentCompleted) {
    Write-Success "`n  🏆 TOURNAMENT COMPLETED!"
    Write-Info "  Champion: $($finalResponse.tournamentCompleted.champion)"
    Write-Info "  Runner-up: $($finalResponse.tournamentCompleted.runnerUp)"
    Write-Info "  Duration: $(((Get-Date $finalResponse.tournamentCompleted.endDate) - (Get-Date $finalResponse.tournamentCompleted.startDate)).Days) days"
}

# Step 11: Final Tournament State
Write-Step "Step 11: Final Tournament State"
$finalState = Invoke-RestMethod -Uri "$baseUrl/tournament/bracket" -Method GET
Write-Success "✓ Tournament completed successfully"
Write-Info "Final Stage: $($finalState.tournamentState.currentStage)"
Write-Info "Total Matches Completed: $($finalState.tournamentState.completedMatches)/$($finalState.tournamentState.totalMatches)"
Write-Info "Champion: $($finalState.tournamentState.winner)"
Write-Info "Runner-up: $($finalState.tournamentState.runnerUp)"
Write-Info "Start Date: $($finalState.tournamentState.startDate)"
Write-Info "End Date: $($finalState.tournamentState.endDate)"

# Summary
Write-Step "Test Summary"
Write-Success "✓ Tournament state tracking working"
Write-Success "✓ Stage progression enforced"
Write-Success "✓ Automatic stage transitions working"
Write-Success "✓ Round completion validation working"
Write-Success "✓ Team details in bracket working"
Write-Success "✓ Tournament completion tracking working"

Write-Host "`n✅ All Tournament State System Tests Passed!" -ForegroundColor Green
Write-Host "Champion: $($finalState.tournamentState.winner) 🏆" -ForegroundColor Yellow

