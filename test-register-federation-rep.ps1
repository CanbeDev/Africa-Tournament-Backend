# PowerShell script to register a federation rep and team

Write-Host "Step 1: Register Federation Representative..." -ForegroundColor Cyan

$federationRepData = @{
    email = "nigeria@test.com"
    password = "password123"
    role = "federation_rep"
    name = "Jose Peseiro"
    country = "Nigeria"
    federation = "Nigerian Football Federation"
} | ConvertTo-Json

try {
    $repResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $federationRepData -ContentType "application/json"
    
    Write-Host "✅ Federation Rep registered!" -ForegroundColor Green
    Write-Host "Token: $($repResponse.token)" -ForegroundColor Yellow
    Write-Host ""
    
    $token = $repResponse.token
    
    Write-Host "Step 2: Register Team using Federation Rep token..." -ForegroundColor Cyan
    
    $teamData = Get-Content -Path "test-request.json" -Raw
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $teamResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/teams/register" -Method POST -Body $teamData -Headers $headers -ContentType "application/json"
    
    Write-Host "✅ Team registered successfully!" -ForegroundColor Green
    Write-Host "Team ID: $($teamResponse.id)" -ForegroundColor Yellow
    Write-Host "Rating: $($teamResponse.rating)" -ForegroundColor Yellow
    Write-Host "Players: $($teamResponse.players.Count)" -ForegroundColor Yellow
    
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

