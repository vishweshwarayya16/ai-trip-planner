# AI TRIP PLANNER - Complete Setup Guide

## 🎯 Project Overview
A full-stack AI-powered trip planning application with email-based password reset functionality.

**Tech Stack:**
- **Frontend**: React.js
- **Backend**: Golang
- **Database**: PostgreSQL
- **AI**: Groq API
- **Email**: SMTP (Gmail)

---

## 📋 Prerequisites

Before starting, install these:

### Windows
- **Node.js** (v16+): https://nodejs.org/
- **Go** (v1.21+): https://go.dev/dl/
- **PostgreSQL** (v14+): https://www.postgresql.org/download/windows/
- **Git**: https://git-scm.com/download/win

### macOS
```bash
brew install node
brew install go
brew install postgresql@14
brew install git
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install nodejs npm
sudo apt install golang-go
sudo apt install postgresql postgresql-contrib
sudo apt install git
```

---

## 🗄️ Database Setup

### Step 1: Start PostgreSQL

**Windows:**
```bash
# PostgreSQL should auto-start after installation
# Check with: 
services.msc
# Look for "postgresql-x64-14"
```

**macOS:**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Access PostgreSQL

```bash
# Windows
psql -U postgres

# macOS
psql postgres

# Linux
sudo -u postgres psql
```

### Step 3: Create Database and Tables

Run these SQL commands in the PostgreSQL prompt:

```sql
-- Create database
CREATE DATABASE trip_planner;

-- Connect to database
\c trip_planner;

-- Create Users table
CREATE TABLE users (
    userid SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Trips table
CREATE TABLE trips (
    tripid SERIAL PRIMARY KEY,
    tripdetails TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Saved table (junction table)
CREATE TABLE saved (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(userid) ON DELETE CASCADE,
    tripid INTEGER REFERENCES trips(tripid) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userid, tripid)
);

-- Create Password Resets table (NEW - for forgot password feature)
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    reset_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX idx_saved_userid ON saved(userid);
CREATE INDEX idx_saved_tripid ON saved(tripid);
CREATE INDEX idx_reset_code ON password_resets(reset_code);
CREATE INDEX idx_email ON password_resets(email);

-- Verify tables were created
\dt

-- You should see:
--  public | password_resets | table | postgres
--  public | saved           | table | postgres
--  public | trips           | table | postgres
--  public | users           | table | postgres

-- Exit PostgreSQL
\q
```

---

## 🔧 Backend Setup

### Step 1: Create Project Structure

```bash
mkdir "TRIP PLANNER"
cd "TRIP PLANNER"
mkdir BACKEND
cd BACKEND
```

### Step 2: Initialize Go Module

```bash
go mod init trip-planner-backend
```

### Step 3: Install Dependencies

```bash
go get github.com/gorilla/mux
go get github.com/lib/pq
go get github.com/golang-jwt/jwt/v5
go get github.com/joho/godotenv
go get github.com/rs/cors
go get golang.org/x/crypto/bcrypt
```

### Step 4: Create Folder Structure

```bash
mkdir config handlers middleware models utils
```

Create these folders and add all the Go files from the artifacts.

### Step 5: Get API Keys

#### Groq API Key
1. Visit: https://console.groq.com/
2. Sign up for free account
3. Go to "API Keys" section
4. Click "Create API Key"
5. Copy the key (starts with `gsk_...`)

#### Gmail App Password
1. Go to: https://myaccount.google.com/
2. Click **"Security"** → Enable **"2-Step Verification"**
3. After enabling, go back to Security
4. Click **"App passwords"**
5. Select **"Mail"** and **"Other (Custom name)"**
6. Name it "Trip Planner" and click **Generate**
7. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### Step 6: Create `.env` File

Create `BACKEND/.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
DB_NAME=trip_planner

# JWT Secret (change this to a random string)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long

# Groq AI API
GROQ_API_KEY=gsk_your_groq_api_key_here

# Server Port
PORT=8081

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password-here
```

**Important**: Replace all placeholder values:
- `your_postgres_password_here` → Your PostgreSQL password
- `your_super_secret_jwt_key_minimum_32_characters_long` → Random secret string
- `gsk_your_groq_api_key_here` → Your actual Groq API key
- `your-email@gmail.com` → Your Gmail address
- `your-16-char-app-password-here` → Gmail app password from Step 5

### Step 7: Run Backend

```bash
go run main.go
```

**Expected Output:**
```
Successfully connected to database
Server starting on port 8081...
```

**If you see errors:**
- `Error connecting to database` → Check PostgreSQL is running and .env credentials
- `Port already in use` → Change PORT in .env to 8082
- `GROQ_API_KEY not set` → Add valid Groq API key to .env

---

## 🎨 Frontend Setup

### Step 1: Navigate to Frontend Folder

Open a **NEW terminal** (keep backend running):

```bash
cd "TRIP PLANNER"
mkdir FRONTEND
cd FRONTEND
```

### Step 2: Create React App

```bash
npx create-react-app .
```

Wait for installation to complete (2-5 minutes).

### Step 3: Install Additional Dependencies

```bash
npm install react-router-dom axios
```

### Step 4: Create Folder Structure

```bash
cd src
mkdir components context styles
```

### Step 5: Create `.env` File

Create `FRONTEND/.env`:

```env
REACT_APP_API_URL=http://localhost:8081
```

**Note**: If your backend runs on a different port (e.g., 8080), change it here.

### Step 6: Add All Frontend Files

Copy all the component files from the artifacts into their respective folders:

```
FRONTEND/src/
├── components/
│   ├── About.js
│   ├── Contact.js
│   ├── GenerateTrip.js
│   ├── Home.js
│   ├── Login.js
│   ├── Navbar.js
│   ├── Register.js
│   ├── ResetPassword.js  ← NEW (for password reset)
│   └── SavedTrips.js
├── context/
│   └── AuthContext.js
├── styles/
│   └── App.css
├── App.js
└── index.js
```

### Step 7: Update `App.js`

Make sure your `App.js` includes the reset password route:

```javascript
import ResetPassword from './components/ResetPassword';

// In your Routes:
<Route path="/reset-password" element={<ResetPassword />} />
```

### Step 8: Run Frontend

```bash
cd FRONTEND
npm start
```

**Expected Output:**
```
Compiled successfully!
You can now view trip-planner-frontend in the browser.
  Local:            http://localhost:3000
```

Browser should automatically open to `http://localhost:3000`

---

## 🧪 Testing the Application

### Test 1: User Registration
1. Go to: http://localhost:3000
2. Click **"Register"**
3. Fill in all fields:
   - First Name: `John`
   - Last Name: `Doe`
   - Username: `johndoe`
   - Email: `your-actual-email@gmail.com` (use real email for testing)
   - Password: `Test@123` (must have uppercase, lowercase, digit, special char)
   - Confirm Password: `Test@123`
4. Click **"Register"**
5. Should redirect to home page with your name in navbar

### Test 2: Password Reset (Email Feature)
1. Click **"Logout"**
2. Click **"Login"**
3. Click **"Forgot Password?"**
4. Enter your registered email
5. Click **"Send Reset Code"**
6. **Check your email inbox** (and spam folder)
7. You should receive an email with a 6-digit code like: `123456`
8. Enter the code in the app
9. Set new password: `NewTest@456`
10. Click **"Reset Password"**
11. Login with new password

### Test 3: Trip Generation
1. Login with your account
2. Click **"Generate Trip"** on home page
3. Fill in trip details:
   - Starting From: `New York`
   - Going To: `Paris`
   - Start Date: Tomorrow's date
   - End Date: Date 7 days from now
   - Travel Type: `Solo`
   - Mood: `Culture`
4. Click **"Generate Trip"**
5. Wait 10-30 seconds for AI to generate itinerary
6. Review the detailed day-by-day plan
7. Click **"View Saved Trips"**

### Test 4: View and Delete Saved Trips
1. Click **"Saved Trips"** in navbar
2. See all your generated trips
3. Click on a trip to view full details
4. Click **🗑️** button to delete a trip
5. Confirm deletion

---

## 📁 Complete Project Structure

```
TRIP-PLANNER/
│
├── BACKEND/
│   ├── config/
│   │   └── database.go
│   ├── handlers/
│   │   ├── auth.go           (Updated - includes password reset)
│   │   └── trip.go
│   ├── middleware/
│   │   └── auth.go
│   ├── models/
│   │   └── user.go
│   ├── utils/
│   │   ├── email.go          (NEW - sends reset codes)
│   │   ├── groq.go
│   │   ├── jwt.go
│   │   └── password.go
│   ├── .env
│   ├── go.mod
│   ├── go.sum
│   └── main.go               (Updated - includes reset routes)
│
└── FRONTEND/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── About.js
    │   │   ├── Contact.js
    │   │   ├── GenerateTrip.js
    │   │   ├── Home.js
    │   │   ├── Login.js      (Updated - simplified)
    │   │   ├── Navbar.js
    │   │   ├── Register.js
    │   │   ├── ResetPassword.js  (NEW - 3-step reset flow)
    │   │   └── SavedTrips.js
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── styles/
    │   │   └── App.css
    │   ├── App.js            (Updated - includes reset route)
    │   └── index.js
    ├── .env
    └── package.json
```

---

## 🔌 API Endpoints

### Public Routes
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/forgot-password` - Send reset code to email
- `POST /api/verify-reset-code` - Verify 6-digit code
- `POST /api/reset-password` - Reset password with code

### Protected Routes (Require JWT Token)
- `GET /api/user` - Get current user info
- `POST /api/generate-trip` - Generate AI trip itinerary
- `GET /api/saved-trips` - Get user's saved trips
- `POST /api/save-trip` - Save a trip
- `DELETE /api/saved-trips/:tripid` - Delete saved trip

---

## 🐛 Common Issues & Solutions

### Issue 1: Database Connection Failed
**Error:** `Error connecting to database`

**Solution:**
```bash
# Check PostgreSQL is running
# Windows:
services.msc  # Look for postgresql service

# macOS:
brew services list

# Linux:
sudo systemctl status postgresql

# Start if not running:
# Windows: Start service in services.msc
# macOS: brew services start postgresql@14
# Linux: sudo systemctl start postgresql

# Verify .env credentials match PostgreSQL setup
```

### Issue 2: Port Already in Use
**Error:** `bind: Only one usage of each socket address is normally permitted`

**Solution:**
```bash
# Windows PowerShell:
netstat -ano | findstr :8081
taskkill /PID <PID_NUMBER> /F

# macOS/Linux:
lsof -i :8081
kill -9 <PID>

# Or change PORT in .env to 8082
```

### Issue 3: Email Not Sending
**Error:** `Failed to send email`

**Solutions:**
1. **Verify Gmail Settings:**
   - 2-Step Verification is enabled
   - App password is correct (no spaces)
   - Using the app password, NOT your regular Gmail password

2. **Check SMTP Settings in .env:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  (remove spaces!)
   ```

3. **Check Backend Logs:**
   - Look for specific error messages
   - Common: "535 authentication failed" = wrong password

4. **Test with Different Email Provider:**
   - Try Outlook/Hotmail:
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   ```

### Issue 4: CORS Error
**Error:** `CORS policy: No 'Access-Control-Allow-Origin'`

**Solution:**
- Ensure backend is running on port 8081
- Check `REACT_APP_API_URL` in frontend .env matches backend PORT
- Restart both servers

### Issue 5: Groq API Error
**Error:** `Error generating trip`

**Solutions:**
1. Verify API key in .env starts with `gsk_`
2. Check API key hasn't expired at https://console.groq.com/
3. Ensure you have remaining API credits
4. Check backend logs for specific error message

### Issue 6: Password Reset Code Not Working
**Error:** `Invalid reset code` or `Reset code expired`

**Solutions:**
1. **Check email arrived** (check spam folder)
2. **Code expires in 1 hour** - request new one if expired
3. **Verify email matches** - use exact same email
4. **Code is 6 digits** - don't include spaces
5. **Check backend logs** for generated code

### Issue 7: CSS Not Loading
**Problem:** Website has no styling

**Solution:**
```bash
# Verify file exists:
FRONTEND/src/styles/App.css

# Check index.js has import:
import './styles/App.css';

# Clear cache and restart:
# Stop React (Ctrl+C)
rm -rf node_modules/.cache  # or delete manually
npm start
```

---

## 🔒 Security Best Practices

### For Production Deployment:

1. **Environment Variables:**
   - Never commit `.env` files to Git
   - Use environment-specific configurations
   - Rotate JWT_SECRET regularly

2. **Database:**
   - Use strong passwords
   - Enable SSL connections
   - Regular backups

3. **API Keys:**
   - Rotate Groq API keys periodically
   - Monitor usage limits
   - Implement rate limiting

4. **Email:**
   - Use dedicated email service (SendGrid, AWS SES)
   - Implement email verification
   - Add unsubscribe links

5. **Backend:**
   - Enable HTTPS only
   - Add request rate limiting
   - Implement input validation
   - Add logging and monitoring

---

## 📊 Database Maintenance

### View All Data
```sql
-- Connect to database
psql -U postgres -d trip_planner

-- View users
SELECT userid, username, email, created_at FROM users;

-- View trips
SELECT tripid, LEFT(tripdetails, 50) as preview, created_at FROM trips;

-- View saved trips
SELECT s.id, u.username, t.tripid, s.saved_at 
FROM saved s 
JOIN users u ON s.userid = u.userid 
JOIN trips t ON s.tripid = t.tripid;

-- View password resets
SELECT * FROM password_resets ORDER BY created_at DESC LIMIT 10;
```

### Clean Old Reset Codes
```sql
-- Delete expired reset codes (older than 24 hours)
DELETE FROM password_resets 
WHERE created_at < NOW() - INTERVAL '24 hours';

-- Delete used reset codes
DELETE FROM password_resets WHERE used = true;
```

### Backup Database
```bash
# Backup
pg_dump -U postgres trip_planner > backup.sql

# Restore
psql -U postgres trip_planner < backup.sql
```

---

## 🚀 Production Deployment

### Backend (Example: Heroku)
```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create trip-planner-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set GROQ_API_KEY=your_key
heroku config:set SMTP_USER=your_email
heroku config:set SMTP_PASSWORD=your_password

# Deploy
git push heroku main
```

### Frontend (Example: Vercel)
```bash
# Install Vercel CLI
npm install -g vercel

# Build
npm run build

# Deploy
vercel

# Set environment variable
vercel env add REACT_APP_API_URL
```

---

## 📞 Support

### If You're Still Stuck:

1. **Check Console Logs:**
   - Backend terminal for server errors
   - Browser console (F12) for frontend errors

2. **Verify All Steps:**
   - Database tables created?
   - All .env variables set?
   - Dependencies installed?
   - Both servers running?

3. **Test Each Component:**
   - Can you connect to database?
   - Does backend start without errors?
   - Does frontend load?
   - Can you register a user?

---

## ✅ Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `trip_planner` created
- [ ] All 4 tables created (users, trips, saved, password_resets)
- [ ] Backend dependencies installed (`go mod tidy`)
- [ ] Backend `.env` configured with all values
- [ ] Groq API key obtained and added
- [ ] Gmail app password created and added
- [ ] Backend running on port 8081
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend `.env` configured
- [ ] All component files created
- [ ] Frontend running on port 3000
- [ ] Can register a new user
- [ ] Can login
- [ ] Can receive password reset email
- [ ] Can generate a trip with AI
- [ ] Can view saved trips

---

## 🎉 You're All Set!

Your AI Trip Planner is now fully functional with:
- ✅ User authentication
- ✅ Email-based password reset
- ✅ AI-powered trip generation
- ✅ Trip saving and management
- ✅ Beautiful responsive design

**Enjoy planning your trips!** 🌍✈️

---

**Last Updated:** October 2024
**Version:** 2.0 (with email password reset)