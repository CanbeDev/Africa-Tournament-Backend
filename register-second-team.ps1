# Register second team - Senegal

Write-Host "Registering Senegal team..." -ForegroundColor Cyan

# Option 1: Register new Federation Rep for Senegal
Write-Host "Step 1: Register Senegal Federation Rep..." -ForegroundColor Yellow
$senegalRep = @{
    email = "senegal@test.com"
    password = "password123"
    role = "federation_rep"
    name = "Aliou Cissé"
    country = "Senegal"
    federation = "Senegalese Football Federation"
} | ConvertTo-Json

try {
    $repResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $senegalRep -ContentType "application/json"
    
    Write-Host "✅ Federation Rep registered!" -ForegroundColor Green
    $token = $repResponse.token
    
    Write-Host "Step 2: Register Senegal Team..." -ForegroundColor Yellow
    
    # Senegal team data
    $senegalTeam = @{
        federation = "Senegalese Football Federation"
        country = "Senegal"
        manager = "Aliou Cissé"
        players = @(
            @{name = "Sadio Mané"; position = "AT"; isCaptain = $true},
            @{name = "Kalidou Koulibaly"; position = "DF"; isCaptain = $false},
            @{name = "Édouard Mendy"; position = "GK"; isCaptain = $false},
            @{name = "Idrissa Gueye"; position = "MD"; isCaptain = $false},
            @{name = "Nampalys Mendy"; position = "MD"; isCaptain = $false},
            @{name = "Pape Matar Sarr"; position = "MD"; isCaptain = $false},
            @{name = "Ismaila Sarr"; position = "AT"; isCaptain = $false},
            @{name = "Boulaye Dia"; position = "AT"; isCaptain = $false},
            @{name = "Iliman Ndiaye"; position = "AT"; isCaptain = $false},
            @{name = "Habib Diallo"; position = "AT"; isCaptain = $false},
            @{name = "Krépin Diatta"; position = "AT"; isCaptain = $false},
            @{name = "Pape Gueye"; position = "MD"; isCaptain = $false},
            @{name = "Cheikhou Kouyaté"; position = "MD"; isCaptain = $false},
            @{name = "Fodé Ballo-Touré"; position = "DF"; isCaptain = $false},
            @{name = "Youssouf Sabaly"; position = "DF"; isCaptain = $false},
            @{name = "Abdou Diallo"; position = "DF"; isCaptain = $false},
            @{name = "Pape Abou Cissé"; position = "DF"; isCaptain = $false},
            @{name = "Formose Mendy"; position = "DF"; isCaptain = $false},
            @{name = "Moussa Niakhaté"; position = "DF"; isCaptain = $false},
            @{name = "Alfred Gomis"; position = "GK"; isCaptain = $false},
            @{name = "Seny Dieng"; position = "GK"; isCaptain = $false},
            @{name = "Lamine Camara"; position = "MD"; isCaptain = $false},
            @{name = "Pathe Ciss"; position = "MD"; isCaptain = $false}
        )
    } | ConvertTo-Json -Depth 10
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $teamResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/teams/register" -Method POST -Body $senegalTeam -Headers $headers -ContentType "application/json"
    
    Write-Host "✅ Senegal team registered successfully!" -ForegroundColor Green
    Write-Host "Team ID: $($teamResponse.id)" -ForegroundColor Yellow
    Write-Host "Country: $($teamResponse.country)" -ForegroundColor Yellow
    Write-Host "Rating: $($teamResponse.rating)" -ForegroundColor Yellow
    Write-Host "Players: $($teamResponse.players.Count)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You now have 2 teams registered!" -ForegroundColor Cyan
    
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

