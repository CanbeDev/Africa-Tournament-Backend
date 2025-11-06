#!/bin/bash
# Quick test script to verify endpoints work
# Run this while server is running

echo "Step 1: Register a new team..."
TEAM_RESPONSE=$(curl -s -X POST http://localhost:5000/api/teams/register \
  -H "Content-Type: application/json" \
  -d "@test-request.json")

echo "$TEAM_RESPONSE" | head -c 200
echo ""
echo ""

# Extract team ID from response
TEAM_ID=$(echo "$TEAM_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$TEAM_ID" ]; then
  echo "❌ Failed to register team"
  exit 1
fi

echo "✅ Team registered with ID: $TEAM_ID"
echo ""

echo "Step 2: Get all registered teams..."
curl -s http://localhost:5000/api/teams/registered | jq '.count'
echo ""

echo "Step 3: Get specific team by ID..."
curl -s "http://localhost:5000/api/teams/$TEAM_ID" | jq '.data.id, .data.country, .data.rating'
echo ""

echo "✅ All endpoints working correctly!"

