const { Resend } = require('resend');

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Pan African Kicks <onboarding@resend.dev>';
const DEMO_KEYS = new Set(['', 're_demo_key', undefined, null]);

class EmailClient {
  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.isDemoMode = DEMO_KEYS.has(apiKey);
    this.client = this.isDemoMode ? null : new Resend(apiKey);
  }

  async send({ to, subject, html, text, from = DEFAULT_FROM }) {
    if (!to) {
      throw new Error('Recipient email address is required');
    }

    if (this.isDemoMode) {
      console.log('📧 [Demo Email]');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      if (text) {
        console.log(text);
      }
      return { id: 'demo-mode' };
    }

    return this.client.emails.send({ from, to, subject, html, text });
  }
}

const emailClient = new EmailClient();

function uniqueRecipients(recipients = []) {
  return Array.from(
    new Set(
      recipients
        .map(r => (typeof r === 'string' ? r.trim() : r))
        .filter(Boolean)
    )
  );
}

function formatDate(date) {
  if (!date) {
    return 'TBD';
  }
  try {
    return new Date(date).toLocaleString();
  } catch (error) {
    return String(date);
  }
}

function buildGoalScorersSections(goalScorers = []) {
  if (!Array.isArray(goalScorers) || goalScorers.length === 0) {
    return { html: '', text: '' };
  }

  const lines = goalScorers.map(scorer => {
    const minute = typeof scorer.minute === 'number' ? `${scorer.minute}'` : '';
    const type = scorer.type ? ` - ${scorer.type}` : '';
    return `${scorer.playerName || 'Unknown'} ${minute}${type}`;
  });

  return {
    html: `
      <div class="goal-scorers">
        <strong>Goal Scorers:</strong><br>
        ${lines.map(line => `• ${line}`).join('<br>')}
      </div>
    `,
    text: `Goal Scorers:\n${lines.map(line => `• ${line}`).join('\n')}`
  };
}

function buildPenaltiesSections(penaltyShootout) {
  if (!penaltyShootout) {
    return { html: '', text: '' };
  }

  const {
    homeTeamPenalties = [],
    awayTeamPenalties = [],
    homeTeamScore = 0,
    awayTeamScore = 0,
    winner
  } = penaltyShootout;

  const formatPenaltyLine = (penalty, index) => {
    const taker = penalty.playerName || `Penalty ${index + 1}`;
    const result = penalty.scored ? '✅ Scored' : '❌ Missed';
    return `${taker} - ${result}`;
  };

  return {
    html: `
      <div class="penalties">
        <strong>Penalty Shootout:</strong><br>
        Final Score: ${homeTeamScore} - ${awayTeamScore}${winner ? ` (${winner} win)` : ''}<br>
        <br>
        <strong>Home Team:</strong><br>
        ${homeTeamPenalties.map(formatPenaltyLine).join('<br>')}<br><br>
        <strong>Away Team:</strong><br>
        ${awayTeamPenalties.map(formatPenaltyLine).join('<br>')}
      </div>
    `,
    text: `Penalties:\nFinal Score: ${homeTeamScore} - ${awayTeamScore}${winner ? ` (${winner} win)` : ''}`
  };
}

function buildMatchEmail(matchData = {}) {
  const {
    homeTeam = 'Home Team',
    awayTeam = 'Away Team',
    homeScore = 0,
    awayScore = 0,
    stage,
    date,
    goalScorers,
    penaltyShootout
  } = matchData;

  const goalScorersSections = buildGoalScorersSections(goalScorers);
  const penaltiesSections = buildPenaltiesSections(penaltyShootout);
  const formattedDate = formatDate(date);

  const subject = `Match Result: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
          .score { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; color: #667eea; }
          .teams { font-size: 24px; text-align: center; margin: 10px 0; }
          .match-info { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .goal-scorers, .penalties { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚽ Match Result</h1>
          </div>
          <div class="content">
            <div class="teams">${homeTeam} vs ${awayTeam}</div>
            <div class="score">${homeScore} - ${awayScore}</div>
            <div class="match-info">
              <strong>Stage:</strong> ${stage || 'Tournament'}<br>
              <strong>Date:</strong> ${formattedDate}<br>
              <strong>Status:</strong> Completed
            </div>
            ${goalScorersSections.html}
            ${penaltiesSections.html}
            <div class="footer">
              <p>Pan African Kicks Tournament</p>
              <p>This is an automated notification.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textLines = [
    `Match Result: ${homeTeam} vs ${awayTeam}`,
    `Score: ${homeScore} - ${awayScore}`,
    `Stage: ${stage || 'Tournament'}`,
    `Date: ${formattedDate}`
  ];

  if (goalScorersSections.text) {
    textLines.push('', goalScorersSections.text);
  }

  if (penaltiesSections.text) {
    textLines.push('', penaltiesSections.text);
  }

  textLines.push('', 'Pan African Kicks Tournament');

  return {
    subject,
    html,
    text: textLines.join('\n')
  };
}

async function sendMatchNotification(matchData, recipients = []) {
  const toList = uniqueRecipients(recipients);

  if (toList.length === 0) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      total: 0,
      error: 'No recipients provided'
    };
  }

  const payload = buildMatchEmail(matchData);

  const results = await Promise.allSettled(
    toList.map(to => emailClient.send({ ...payload, to }))
  );

  const sent = results.filter(result => result.status === 'fulfilled').length;
  const failed = results.length - sent;

  if (failed > 0) {
    results
      .filter(result => result.status === 'rejected')
      .forEach(result => {
        console.error('Email send failure:', result.reason);
      });
  }

  return {
    success: failed === 0,
    sent,
    failed,
    total: toList.length
  };
}

async function notifyFederations(matchData, federationEmails = []) {
  return sendMatchNotification(matchData, federationEmails);
}

async function notifyViewers(matchData, viewerEmails = []) {
  return sendMatchNotification(matchData, viewerEmails);
}

function buildVictoryEmail(matchData = {}, federationUser = {}) {
  const {
    homeTeam,
    awayTeam,
    winner,
    stage,
    date,
    penaltyShootout
  } = matchData;

  const subject = `Congratulations ${winner}!`;
  const formattedDate = formatDate(date);
  const opponent = homeTeam === winner ? awayTeam : homeTeam;
  const penaltiesSummary = penaltyShootout
    ? `The match went to penalties with a ${penaltyShootout.homeTeamScore}-${penaltyShootout.awayTeamScore} shootout.`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Congratulations ${federationUser.name || winner}!</h2>
      <p>Your federation team <strong>${winner}</strong> has won the ${stage || 'tournament'} match against ${opponent}.</p>
      <p>Date: ${formattedDate}</p>
      ${penaltiesSummary ? `<p>${penaltiesSummary}</p>` : ''}
      <p>Thank you for leading your federation in the Pan African Kicks tournament.</p>
    </div>
  `;

  const text = [
    `Congratulations ${federationUser.name || winner}!`,
    `${winner} won the ${stage || 'tournament'} match against ${opponent} on ${formattedDate}.`,
    penaltiesSummary,
    'Thank you for being part of Pan African Kicks!'
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

async function notifyFederationTeamVictory(matchData, federationUser = {}) {
  if (!federationUser.email) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      total: 0,
      error: 'Federation user email not provided'
    };
  }

  const payload = buildVictoryEmail(matchData, federationUser);

  try {
    await emailClient.send({ ...payload, to: federationUser.email });
    return { success: true, sent: 1, failed: 0, total: 1 };
  } catch (error) {
    console.error('Victory email send failure:', error);
    return { success: false, sent: 0, failed: 1, total: 1, error: error.message };
  }
}

function buildFederationWelcomeEmail({ name, country, federation }) {
  const subject = 'Welcome to the Pan African Kicks Federation Portal';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h1>Welcome ${name || 'Federation Representative'}!</h1>
      <p>We are excited to have ${federation || 'your federation'} representing ${country || 'your nation'} in the Pan African Kicks tournament.</p>
      <p>You can now manage squad registrations, receive match notifications, and coordinate match-day logistics through the federation dashboard.</p>
      <p>If you have any questions, simply reply to this email and a member of our support team will assist you.</p>
      <p>Good luck this season!</p>
      <p>— The Pan African Kicks Organising Committee</p>
    </div>
  `;

  const text = [
    `Welcome ${name || 'Federation Representative'}!`,
    `We are excited to have ${federation || 'your federation'} representing ${country || 'your nation'} in the Pan African Kicks tournament.`,
    'You can now manage squads and receive match notifications through the federation dashboard.',
    'Reply to this email if you need any assistance.',
    '— The Pan African Kicks Organising Committee'
  ].join('\n');

  return { subject, html, text };
}

async function sendFederationWelcomeEmail({ email, name, country, federation }) {
  if (!email) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      total: 0,
      error: 'Recipient email is required'
    };
  }

  const payload = buildFederationWelcomeEmail({ name, country, federation });

  try {
    await emailClient.send({ ...payload, to: email });
    return { success: true, sent: 1, failed: 0, total: 1 };
  } catch (error) {
    console.error('Welcome email send failure:', error);
    return { success: false, sent: 0, failed: 1, total: 1, error: error.message };
  }
}

module.exports = {
  sendMatchNotification,
  notifyFederations,
  notifyViewers,
  notifyFederationTeamVictory,
  sendFederationWelcomeEmail
}; 
