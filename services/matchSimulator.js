/**
 * Match Simulator Service
 * Generates detailed match results with goal scorers and commentary
 */

// Player name generators (mock)
const playerNames = [
  'V. Osimhen', 'S. Mané', 'M. Salah', 'A. Hakimi', 'W. Ndidi', 
  'I. Perisić', 'T. Partey', 'Y. En-Nesyri', 'K. Mbappé', 'E. Haaland',
  'K. Benzema', 'R. Mahrez', 'N. Kanté', 'S. Agüero', 'L. Messi',
  'J. Kimmich', 'T. Kroos', 'S. Gnabry', 'H. Kane', 'P. Aubameyang'
];

// Commentary templates
const commentaryTemplates = {
  kickoff: [
    'The match is underway! {homeTeam} kicks off against {awayTeam}.',
    'And we\'re off! {homeTeam} vs {awayTeam} has begun.',
    'Kickoff! The action starts now between {homeTeam} and {awayTeam}.'
  ],
  goal: [
    'GOAL! {playerName} scores for {team} in the {minute} minute!',
    '{playerName} finds the back of the net! {team} leads!',
    'What a strike by {playerName}! {team} scores!'
  ],
  halftime: [
    'Half-time! {homeTeam} {scoreA} - {scoreB} {awayTeam}.',
    'The referee blows for half-time. {scoreA}-{scoreB}.',
    'Half-time break. The score stands at {scoreA}-{scoreB}.'
  ],
  fulltime: [
    'Full-time! {homeTeam} {scoreA} - {scoreB} {awayTeam}. {winner} wins!',
    'The match ends! Final score: {scoreA}-{scoreB}.',
    'That\'s it! {winner} takes the victory with a {scoreA}-{scoreB} win.'
  ],
  possession: [
    '{team} controls the ball...',
    '{team} is dominating possession.',
    '{team} builds from the back.'
  ],
  attack: [
    '{team} launches an attack!',
    '{team} breaks forward with pace!',
    '{team} creates a chance!'
  ],
  chance: [
    'Big chance for {team}!',
    '{team} comes close!',
    'Opportunity missed by {team}!'
  ]
};

function getRandomTemplate(templates) {
  return templates[Math.floor(Math.random() * templates.length)];
}

function formatCommentary(template, data) {
  return template
    .replace(/{homeTeam}/g, data.homeTeam || '')
    .replace(/{awayTeam}/g, data.awayTeam || '')
    .replace(/{team}/g, data.team || '')
    .replace(/{playerName}/g, data.playerName || '')
    .replace(/{minute}/g, data.minute || '')
    .replace(/{scoreA}/g, data.scoreA || '0')
    .replace(/{scoreB}/g, data.scoreB || '0')
    .replace(/{winner}/g, data.winner || '');
}

function getRandomPlayer(teamName) {
  return playerNames[Math.floor(Math.random() * playerNames.length)];
}

/**
 * Generate realistic match statistics based on final score
 * @param {number} homeScore - Home team goals
 * @param {number} awayScore - Away team goals
 * @returns {Object} Match statistics object
 */
function generateMatchStatistics(homeScore, awayScore) {
  // Base stats on score differential
  const scoreDiff = homeScore - awayScore;
  const totalGoals = homeScore + awayScore;
  
  // Generate possession (fairly balanced with slight bias to winning team)
  let homePossession = 50 + (scoreDiff * 5) + (Math.random() * 10 - 5);
  homePossession = Math.max(35, Math.min(65, homePossession));
  const awayPossession = 100 - homePossession;
  
  // Generate shots (more shots for team with more goals, but add randomness)
  const baseShots = 8 + Math.floor(Math.random() * 6);
  const homeShots = Math.max(5, baseShots + homeScore * 2 + Math.floor(Math.random() * 5));
  const awayShots = Math.max(5, baseShots + awayScore * 2 + Math.floor(Math.random() * 5));
  
  // Shots on target (at least as many as goals scored)
  const homeShotsOnTarget = Math.max(homeScore, Math.floor(homeShots * (0.3 + Math.random() * 0.25)));
  const awayShotsOnTarget = Math.max(awayScore, Math.floor(awayShots * (0.3 + Math.random() * 0.25)));
  
  // Other statistics
  const homeCorners = Math.floor(Math.random() * 8) + 2;
  const awayCorners = Math.floor(Math.random() * 8) + 2;
  
  const homeFouls = Math.floor(Math.random() * 12) + 8;
  const awayFouls = Math.floor(Math.random() * 12) + 8;
  
  const homeYellowCards = Math.floor(Math.random() * 4);
  const awayYellowCards = Math.floor(Math.random() * 4);
  
  const homeRedCards = Math.random() < 0.1 ? 1 : 0;
  const awayRedCards = Math.random() < 0.1 ? 1 : 0;
  
  const homePassAccuracy = Math.floor(65 + Math.random() * 25);
  const awayPassAccuracy = Math.floor(65 + Math.random() * 25);
  
  return {
    possession: { 
      home: Math.round(homePossession), 
      away: Math.round(awayPossession) 
    },
    shots: { home: homeShots, away: awayShots },
    shotsOnTarget: { home: homeShotsOnTarget, away: awayShotsOnTarget },
    corners: { home: homeCorners, away: awayCorners },
    fouls: { home: homeFouls, away: awayFouls },
    yellowCards: { home: homeYellowCards, away: awayYellowCards },
    redCards: { home: homeRedCards, away: awayRedCards },
    passAccuracy: { home: homePassAccuracy, away: awayPassAccuracy }
  };
}

/**
 * Simulate a full match with detailed events
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @param {string} stage - Tournament stage
 * @returns {Object} Complete match result with commentary and goal scorers
 */
function simulateFullMatch(homeTeam, awayTeam, stage = 'Quarter Final') {
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const events = [];
  const goalScorers = [];
  let homeScore = 0;
  let awayScore = 0;
  
  // Kickoff event
  events.push({
    minute: 0,
    type: 'kickoff',
    description: formatCommentary(
      getRandomTemplate(commentaryTemplates.kickoff),
      { homeTeam, awayTeam }
    )
  });
  
  // Simulate 90 minutes
  for (let minute = 1; minute <= 90; minute++) {
    // Random events with probabilities
    const rand = Math.random();
    
    // Goal probability: 5% per minute
    if (rand < 0.05) {
      const isHomeGoal = Math.random() < 0.5;
      const scoringTeam = isHomeGoal ? homeTeam : awayTeam;
      const playerName = getRandomPlayer(scoringTeam);
      
      if (isHomeGoal) {
        homeScore++;
      } else {
        awayScore++;
      }
      
      // Add goal event
      events.push({
        minute,
        type: 'goal',
        team: scoringTeam,
        playerName,
        description: formatCommentary(
          getRandomTemplate(commentaryTemplates.goal),
          { playerName, team: scoringTeam, minute }
        )
      });
      
      // Add goal scorer
      goalScorers.push({
        playerName,
        minute,
        type: 'normal',
        team: scoringTeam
      });
    }
    // Attack probability: 10% per minute
    else if (rand < 0.15) {
      const attackingTeam = Math.random() < 0.5 ? homeTeam : awayTeam;
      events.push({
        minute,
        type: 'attack',
        team: attackingTeam,
        description: formatCommentary(
          getRandomTemplate(commentaryTemplates.attack),
          { team: attackingTeam }
        )
      });
    }
    // Possession probability: 15% per minute
    else if (rand < 0.30) {
      const possessingTeam = Math.random() < 0.5 ? homeTeam : awayTeam;
      events.push({
        minute,
        type: 'possession',
        team: possessingTeam,
        description: formatCommentary(
          getRandomTemplate(commentaryTemplates.possession),
          { team: possessingTeam }
        )
      });
    }
    
    // Half-time event
    if (minute === 45) {
      events.push({
        minute: 45,
        type: 'halftime',
        description: formatCommentary(
          getRandomTemplate(commentaryTemplates.halftime),
          { homeTeam, awayTeam, scoreA: homeScore, scoreB: awayScore }
        )
      });
    }
  }
  
  // Full-time event
  const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : 'Draw';
  events.push({
    minute: 90,
    type: 'fulltime',
    description: formatCommentary(
      getRandomTemplate(commentaryTemplates.fulltime),
      { homeTeam, awayTeam, scoreA: homeScore, scoreB: awayScore, winner }
    )
  });
  
  // Generate match statistics
  const statistics = generateMatchStatistics(homeScore, awayScore);
  
  return {
    id: matchId,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    status: 'completed',
    date: new Date().toISOString(),
    stage: stage,
    winner: winner !== 'Draw' ? winner : null,
    goalScorers,
    commentary: events,
    statistics,
    matchType: 'simulated',
    createdAt: new Date().toISOString()
  };
}

/**
 * Simulate match and auto-advance winner if match is part of tournament bracket
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 * @param {string} stage - Tournament stage
 * @param {string} matchId - Match ID (optional)
 * @param {Function} advanceCallback - Callback to advance winner (optional)
 * @returns {Object} Complete match result
 */
async function simulateMatchWithAdvancement(homeTeam, awayTeam, stage = 'Quarter Final', matchId = null, advanceCallback = null) {
  const matchResult = simulateFullMatch(homeTeam, awayTeam, stage);
  
  // If matchId provided, use it instead of generated one
  if (matchId) {
    matchResult.id = matchId;
  }
  
  // If winner exists and advancement callback provided, advance the winner
  if (matchResult.winner && advanceCallback && typeof advanceCallback === 'function') {
    try {
      await advanceCallback(matchResult.id, matchResult.winner);
    } catch (error) {
      console.error('Failed to auto-advance winner:', error);
      // Don't throw - match simulation succeeded, advancement is secondary
    }
  }
  
  return matchResult;
}

/**
 * Generate player-level statistics for a match
 * @param {Object} homeTeamData - Full home team object
 * @param {Object} awayTeamData - Full away team object
 * @param {Array} goalScorers - Array of goal scorers
 * @param {Object} matchStats - Team-level match statistics
 * @returns {Array} Player statistics array
 */
function generatePlayerStatistics(homeTeamData, awayTeamData, goalScorers, matchStats) {
  const playerStats = [];
  const allPlayers = [
    ...homeTeamData.players.map(p => ({ ...p, team: homeTeamData.country })),
    ...awayTeamData.players.map(p => ({ ...p, team: awayTeamData.country }))
  ];
  
  // Select starting 11 for each team (prioritize by position rating)
  const homeStarters = homeTeamData.players
    .sort((a, b) => {
      const aRating = Math.max(a.ratings.GK, a.ratings.DF, a.ratings.MD, a.ratings.AT);
      const bRating = Math.max(b.ratings.GK, b.ratings.DF, b.ratings.MD, b.ratings.AT);
      return bRating - aRating;
    })
    .slice(0, 11);
    
  const awayStarters = awayTeamData.players
    .sort((a, b) => {
      const aRating = Math.max(a.ratings.GK, a.ratings.DF, a.ratings.MD, a.ratings.AT);
      const bRating = Math.max(b.ratings.GK, b.ratings.DF, b.ratings.MD, b.ratings.AT);
      return bRating - aRating;
    })
    .slice(0, 11);
  
  const starters = [
    ...homeStarters.map(p => ({ ...p, team: homeTeamData.country })),
    ...awayStarters.map(p => ({ ...p, team: awayTeamData.country }))
  ];
  
  // Track which players received cards
  const yellowCardCount = matchStats.yellowCards.home + matchStats.yellowCards.away;
  const redCardCount = matchStats.redCards.home + matchStats.redCards.away;
  const yellowCardPlayers = new Set();
  const redCardPlayers = new Set();
  
  // Randomly assign yellow cards
  for (let i = 0; i < yellowCardCount; i++) {
    const player = starters[Math.floor(Math.random() * starters.length)];
    yellowCardPlayers.add(player.name);
  }
  
  // Randomly assign red cards
  for (let i = 0; i < redCardCount; i++) {
    const player = starters[Math.floor(Math.random() * starters.length)];
    redCardPlayers.add(player.name);
  }
  
  // Generate stats for each starter
  starters.forEach(player => {
    const positionRating = player.ratings[player.naturalPosition] || 70;
    const isHome = player.team === homeTeamData.country;
    
    // Calculate player-specific stats based on position and rating
    const minutesPlayed = redCardPlayers.has(player.name) 
      ? Math.floor(Math.random() * 60) + 10 // Red carded players play 10-70 minutes
      : 90; // Full match
    
    // Goals
    const goals = goalScorers.filter(g => g.playerName === player.name).length;
    
    // Assists (random based on position)
    const assistProb = player.naturalPosition === 'MD' ? 0.2 : player.naturalPosition === 'AT' ? 0.15 : 0.05;
    const assists = Math.random() < assistProb ? Math.floor(Math.random() * 2) : 0;
    
    // Shots (attackers shoot more)
    const shotMultiplier = player.naturalPosition === 'AT' ? 1.5 : player.naturalPosition === 'MD' ? 1.0 : 0.3;
    const shots = Math.floor((Math.random() * 4 + 1) * shotMultiplier);
    const shotsOnTarget = Math.floor(shots * (0.3 + Math.random() * 0.3));
    
    // xG (Expected Goals) - based on position and rating
    const xGBase = player.naturalPosition === 'AT' ? 0.5 : player.naturalPosition === 'MD' ? 0.2 : 0.05;
    const xG = parseFloat((xGBase * (positionRating / 80) * (1 + Math.random())).toFixed(2));
    
    // Passes (midfielders and defenders pass more)
    const passMultiplier = player.naturalPosition === 'MD' ? 2.0 : player.naturalPosition === 'DF' ? 1.5 : 1.0;
    const passes = Math.floor((30 + Math.random() * 40) * passMultiplier);
    const passAccuracy = Math.floor(65 + (positionRating / 100) * 25 + Math.random() * 10);
    
    // Defensive stats (defenders and midfielders)
    const tackleMultiplier = player.naturalPosition === 'DF' ? 2.0 : player.naturalPosition === 'MD' ? 1.2 : 0.3;
    const tackles = Math.floor((2 + Math.random() * 4) * tackleMultiplier);
    const interceptions = Math.floor((1 + Math.random() * 3) * tackleMultiplier);
    
    // Fouls
    const fouls = Math.floor(Math.random() * 3);
    
    // Match rating (6.0 - 9.5)
    let rating = 6.0 + (positionRating / 100) * 2 + Math.random() * 1.0;
    rating += goals * 0.5 + assists * 0.3;
    rating = Math.min(9.5, Math.max(6.0, rating));
    
    // Injury chance (1% for any player)
    const injured = Math.random() < 0.01;
    
    playerStats.push({
      playerName: player.name,
      team: player.team,
      position: player.naturalPosition,
      minutesPlayed,
      goals,
      assists,
      shots,
      shotsOnTarget,
      xG,
      passes,
      passAccuracy,
      tackles,
      interceptions,
      fouls,
      yellowCard: yellowCardPlayers.has(player.name),
      redCard: redCardPlayers.has(player.name),
      injured,
      rating: parseFloat(rating.toFixed(1))
    });
  });
  
  return playerStats;
}

/**
 * Simulate match based on team ratings from actual squads
 * @param {Object} homeTeamData - Full team object with players and rating
 * @param {Object} awayTeamData - Full team object with players and rating
 * @param {string} stage - Tournament stage
 * @returns {Object} Complete match result
 */
function simulateMatchWithRatings(homeTeamData, awayTeamData, stage = 'Quarter Final') {
  const homeTeam = homeTeamData.country;
  const awayTeam = awayTeamData.country;
  const homeRating = homeTeamData.rating || 75;
  const awayRating = awayTeamData.rating || 75;
  
  // Calculate win probabilities based on ratings
  const ratingDiff = homeRating - awayRating;
  const homeWinProb = 0.5 + (ratingDiff * 0.02); // 1 rating point = 2% win probability shift
  
  // Determine winner and score based on ratings
  const rand = Math.random();
  let homeScore = 0;
  let awayScore = 0;
  
  if (rand < homeWinProb) {
    // Home wins
    homeScore = 1 + Math.floor(Math.random() * 3); // 1-3 goals
    awayScore = Math.random() < 0.4 ? Math.floor(Math.random() * homeScore) : 0;
  } else {
    // Away wins
    awayScore = 1 + Math.floor(Math.random() * 3);
    homeScore = Math.random() < 0.4 ? Math.floor(Math.random() * awayScore) : 0;
  }
  
  // Generate goal scorers from actual squad players
  const goalScorers = [];
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Home team goals
  for (let i = 0; i < homeScore; i++) {
    const attackers = homeTeamData.players.filter(p => 
      p.naturalPosition === 'AT' || p.ratings.AT > 70
    );
    const scorer = attackers.length > 0 
      ? attackers[Math.floor(Math.random() * attackers.length)]
      : homeTeamData.players[Math.floor(Math.random() * homeTeamData.players.length)];
    
    goalScorers.push({
      playerName: scorer.name,
      minute: 1 + Math.floor(Math.random() * 90),
      type: 'normal',
      team: homeTeam
    });
  }
  
  // Away team goals
  for (let i = 0; i < awayScore; i++) {
    const attackers = awayTeamData.players.filter(p => 
      p.naturalPosition === 'AT' || p.ratings.AT > 70
    );
    const scorer = attackers.length > 0 
      ? attackers[Math.floor(Math.random() * attackers.length)]
      : awayTeamData.players[Math.floor(Math.random() * awayTeamData.players.length)];
    
    goalScorers.push({
      playerName: scorer.name,
      minute: 1 + Math.floor(Math.random() * 90),
      type: 'normal',
      team: awayTeam
    });
  }
  
  // Sort by minute
  goalScorers.sort((a, b) => a.minute - b.minute);
  
  // Generate statistics
  const statistics = generateMatchStatistics(homeScore, awayScore);
  
  // Generate basic commentary events
  const events = [
    {
      minute: 0,
      type: 'kickoff',
      description: `The match is underway! ${homeTeam} kicks off against ${awayTeam}.`
    }
  ];
  
  // Add goal events
  goalScorers.forEach(goal => {
    events.push({
      minute: goal.minute,
      type: 'goal',
      team: goal.team,
      playerName: goal.playerName,
      description: `GOAL! ${goal.playerName} scores for ${goal.team} in the ${goal.minute} minute!`
    });
  });
  
  // Halftime
  events.push({
    minute: 45,
    type: 'halftime',
    description: `Half-time! ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}.`
  });
  
  // Fulltime
  const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : null;
  events.push({
    minute: 90,
    type: 'fulltime',
    description: `Full-time! ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}.`
  });
  
  // Generate player statistics
  const playerStats = generatePlayerStatistics(homeTeamData, awayTeamData, goalScorers, statistics);
  
  return {
    id: matchId,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    status: 'completed',
    date: new Date().toISOString(),
    stage: stage,
    winner,
    goalScorers,
    commentary: events,
    statistics,
    playerStats,
    matchType: 'simulated',
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  simulateFullMatch,
  simulateMatchWithAdvancement,
  simulateMatchWithRatings
};

