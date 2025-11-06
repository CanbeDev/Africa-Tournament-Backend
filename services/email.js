const { Resend } = require('resend');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY || 're_demo_key');

/**
 * Send match completion notification email
 * @param {Object} matchData - Match data with results
 * @param {Array} recipients - Array of email addresses
 * @returns {Promise}
 */
async function sendMatchNotification(matchData, recipients) {
  try {
    // If no API key or demo mode, just log
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_demo_key') {
      console.log('📧 Email notification (demo mode):');
      console.log(`To: ${recipients.join(', ')}`);
      console.log(`Subject: Match Result: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
      console.log(`Score: ${matchData.homeScore} - ${matchData.awayScore}`);
      return { success: true, demo: true };
    }

    const { homeTeam, awayTeam, homeScore, awayScore, goalScorers = [], stage, date } = matchData;
    
    // Build goal scorers text
    let goalScorersText = '';
    if (goalScorers.length > 0) {
      goalScorersText = '\n\nGoal Scorers:\n';
      goalScorers.forEach(goalscorer => {
        goalScorersText += `• ${goalscorer.playerName} (${goalscorer.minute}') - ${goalscorer.type}\n`;
      });
    } else {
      goalScorersText = '\n\nNo goals scored.';
    }

    // Email HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            .score { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; color: #667eea; }
            .teams { font-size: 24px; text-align: center; margin: 10px 0; }
            .match-info { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .goal-scorers { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
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
                <strong>Date:</strong> ${new Date(date).toLocaleString()}<br>
                <strong>Status:</strong> Completed
              </div>

              ${goalScorers.length > 0 ? `
              <div class="goal-scorers">
                <strong>Goal Scorers:</strong><br>
                ${goalScorers.map(gs => `• ${gs.playerName} (${gs.minute}') - ${gs.type}`).join('<br>')}
              </div>
              ` : ''}

              <div class="footer">
                <p>Pan African Kicks Tournament</p>
                <p>This is an automated notification.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Plain text version
    const textContent = `
Match Result: ${homeTeam} vs ${awayTeam}

Score: ${homeScore} - ${awayScore}

Stage: ${stage || 'Tournament'}
Date: ${new Date(date).toLocaleString()}
${goalScorersText}

---
Pan African Kicks Tournament
    `.trim();

    // Send email to all recipients
    const emailPromises = recipients.map(email => 
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Pan African Kicks <onboarding@resend.dev>',
        to: email,
        subject: `Match Result: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`,
        html: htmlContent,
        text: textContent,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: successful > 0,
      sent: successful,
      failed: failed,
      total: recipients.length
    };

  } catch (error) {
    console.error('Error sending email notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send notification to federation representatives
 * @param {Object} matchData - Match data
 * @param {Array} federationEmails - Array of federation email addresses
 */
async function notifyFederations(matchData, federationEmails) {
  return sendMatchNotification(matchData, federationEmails);
}

/**
 * Send notification to all registered viewers
 * @param {Object} matchData - Match data
 * @param {Array} viewerEmails - Array of viewer email addresses
 */
async function notifyViewers(matchData, viewerEmails) {
  return sendMatchNotification(matchData, viewerEmails);
}

module.exports = {
  sendMatchNotification,
  notifyFederations,
  notifyViewers
};

