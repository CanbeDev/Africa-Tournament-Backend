# Match Persistence & Email Notifications Guide

## Features Implemented

### ✅ Match Persistence
- **Full match results saved**: Scoreline, goal scorers (with minutes), complete commentary
- **Structured storage**: Matches include all event details, player names, and timestamps
- **Query support**: GET `/api/matches/:id` returns complete match details

### ✅ Email Notifications
- **Resend integration**: Free tier email service (3,000 emails/month)
- **Automated notifications**: Sent to all registered users (federation reps & viewers) when matches complete
- **HTML emails**: Beautiful formatted match result emails with goal scorers
- **Demo mode**: Works without API key (logs to console for testing)

---

## Setup Instructions

### 1. Get Resend API Key (Free)

1. Go to [https://resend.com](https://resend.com)
2. Sign up for free account
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy your API key

### 2. Configure Environment Variables

Create or update `backend/.env`:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Pan African Kicks <noreply@yourdomain.com>
```

**Note**: For testing, you can use Resend's default sender:
```env
RESEND_FROM_EMAIL=Pan African Kicks <onboarding@resend.dev>
```

### 3. Test Email Notifications

The system runs in **demo mode** if no API key is set (emails logged to console).

**Test with actual emails:**
1. Set `RESEND_API_KEY` in your `.env` file
2. Register users with valid email addresses
3. Simulate a match
4. Check your inbox!

---

## Match Data Structure

### Complete Match Object

```json
{
  "id": "match_1735678901_abc123",
  "homeTeam": "Nigeria",
  "awayTeam": "Senegal",
  "homeScore": 2,
  "awayScore": 1,
  "status": "completed",
  "date": "2025-01-31T10:00:00.000Z",
  "stage": "Quarter Final",
  "winner": "Nigeria",
  "goalScorers": [
    {
      "playerName": "V. Osimhen",
      "minute": 23,
      "type": "normal",
      "team": "Nigeria"
    },
    {
      "playerName": "S. Mané",
      "minute": 45,
      "type": "normal",
      "team": "Senegal"
    },
    {
      "playerName": "W. Ndidi",
      "minute": 78,
      "type": "normal",
      "team": "Nigeria"
    }
  ],
  "commentary": [
    {
      "minute": 0,
      "type": "kickoff",
      "description": "The match is underway! Nigeria kicks off against Senegal."
    },
    {
      "minute": 23,
      "type": "goal",
      "team": "Nigeria",
      "playerName": "V. Osimhen",
      "description": "GOAL! V. Osimhen scores for Nigeria in the 23 minute!"
    },
    {
      "minute": 45,
      "type": "halftime",
      "description": "Half-time! Nigeria 1 - 1 Senegal."
    },
    {
      "minute": 78,
      "type": "goal",
      "team": "Nigeria",
      "playerName": "W. Ndidi",
      "description": "W. Ndidi finds the back of the net! Nigeria leads!"
    },
    {
      "minute": 90,
      "type": "fulltime",
      "description": "Full-time! Nigeria 2 - 1 Senegal. Nigeria wins!"
    }
  ],
  "createdAt": "2025-01-31T10:00:00.000Z"
}
```

---

## API Endpoints

### POST `/api/matches/simulate`
**Description**: Simulate a match with full details (Admin only)  
**Request**:
```json
{
  "homeTeam": "Nigeria",
  "awayTeam": "Senegal",
  "stage": "Quarter Final"
}
```
**Response**: Complete match object with goal scorers and commentary

### GET `/api/matches/:id`
**Description**: Get match with complete details  
**Response**: Full match object including:
- Scoreline
- Goal scorers with minutes
- Complete commentary timeline
- All match events

---

## Email Notification Details

### Who Gets Notified?
- **Federation Representatives**: All registered `federation_rep` users
- **Viewers**: All registered `viewer` users

### Email Content
- Match scoreline (e.g., "Nigeria 2 - 1 Senegal")
- Goal scorers with minutes
- Match stage and date
- HTML formatted with styling

### Email Template Features
- Responsive HTML design
- Team names and scores prominently displayed
- Goal scorers listed with minutes
- Tournament branding
- Professional appearance

---

## Testing

### Test Match Simulation

```bash
# 1. Register users first
POST /api/auth/register
{
  "email": "viewer@test.com",
  "password": "password123",
  "role": "viewer"
}

# 2. Login as admin
POST /api/auth/login
{
  "email": "admin@test.com",
  "password": "password123"
}

# 3. Simulate match (requires admin token)
POST /api/matches/simulate
Authorization: Bearer <token>
{
  "homeTeam": "Nigeria",
  "awayTeam": "Senegal",
  "stage": "Quarter Final"
}
```

### Test Email Notifications (Demo Mode)

Without API key set, check console logs:
```
📧 Email notification (demo mode):
To: viewer@test.com
Subject: Match Result: Nigeria vs Senegal
Score: 2 - 1
```

### Test Email Notifications (Live Mode)

1. Set `RESEND_API_KEY` in `.env`
2. Register users with real email addresses
3. Simulate match
4. Check inboxes!

---

## Files Created/Modified

**New Files:**
- `backend/services/email.js` - Email notification service
- `backend/services/matchSimulator.js` - Enhanced match simulation
- `backend/.env.example` - Environment variable template

**Modified:**
- `backend/routes/matches.js` - Enhanced simulation with persistence & notifications
- `backend/server.js` - Added Resend configuration notes

**Dependencies:**
- `resend` - Email service (installed)

---

## Next Steps

1. **Set up Resend API key** (free tier)
2. **Test match simulation** and verify emails
3. **Customize email template** if needed
4. **Add email preferences** (opt-in/opt-out per user)
5. **Track email delivery** status if needed

---

## Troubleshooting

### Emails not sending?
- Check `RESEND_API_KEY` is set correctly
- Verify email addresses are valid
- Check Resend dashboard for errors
- Check server console logs

### Demo mode active?
- If no API key set, emails log to console
- This is expected behavior for testing

### Match data not persisting?
- Data is stored in memory (lost on server restart)
- To persist, integrate with database (MongoDB recommended)

