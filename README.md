# 🌍 AI Trip Planner - Setup Guide

## 📥 Software Requirements

Download and install these before starting:

| Software | Version | Download Link |
|----------|---------|---------------|
| **Node.js** | v16 or higher | https://nodejs.org/ |
| **Go** | v1.21 or higher | https://go.dev/dl/ |
| **PostgreSQL** | v14 or higher | https://www.postgresql.org/download/ |
| **Git** | Latest | https://git-scm.com/ |

---

## 🗄️ Database Setup

### Step 1: Open PostgreSQL

```bash
psql -U postgres
```
Enter your PostgreSQL password when prompted.

### Step 2: Run These SQL Queries

Copy and paste all the following SQL commands:

```sql
-- Create Database
CREATE DATABASE new_trip_planner;
\c new_trip_planner;

-- Users Table
CREATE TABLE users (
    userid SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trips Table
CREATE TABLE trips (
    tripid SERIAL PRIMARY KEY,
    tripdetails TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved Trips Table
CREATE TABLE saved (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(userid) ON DELETE CASCADE,
    tripid INTEGER REFERENCES trips(tripid) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userid, tripid)
);

CREATE INDEX idx_saved_userid ON saved(userid);
CREATE INDEX idx_saved_tripid ON saved(tripid);

-- Password Resets Table
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    reset_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_reset_code ON password_resets(reset_code);
CREATE INDEX idx_reset_email ON password_resets(email);

-- Registration OTPs Table
CREATE TABLE registration_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('user', 'agency'))
);

CREATE INDEX idx_reg_otp_code ON registration_otps(otp_code);
CREATE INDEX idx_reg_otp_email ON registration_otps(email);

-- Contact Messages Table
CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    replied BOOLEAN DEFAULT FALSE,
    admin_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP
);

CREATE INDEX idx_contact_email ON contact_messages(email);
CREATE INDEX idx_contact_replied ON contact_messages(replied);

-- Travel Agencies Table
CREATE TABLE travel_agencies (
    agency_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(30),
    website VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Travel Packages Table
CREATE TABLE travel_packages (
    package_id SERIAL PRIMARY KEY,
    agency_id INTEGER REFERENCES travel_agencies(agency_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(150) NOT NULL,
    initial_destination VARCHAR(150) NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    num_travelers INTEGER NOT NULL CHECK (num_travelers > 0),
    transport_mode VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price > 0),
    is_active BOOLEAN DEFAULT TRUE,
    locations TEXT[],
    photos TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_packages_agency_id ON travel_packages(agency_id);

-- Feedbacks Table
CREATE TABLE feedbacks (
    feedback_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('trip_plan', 'travel_agency')),
    district_name VARCHAR(100),
    agency_id INTEGER REFERENCES travel_agencies(agency_id) ON DELETE SET NULL,
    feedback_text TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
    hotel_name VARCHAR(255),
    hotel_feedback TEXT,
    hotel_rating INTEGER CHECK (hotel_rating IS NULL OR (hotel_rating >= 0 AND hotel_rating <= 5)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX idx_feedbacks_agency_id ON feedbacks(agency_id);
CREATE INDEX idx_feedbacks_type ON feedbacks(feedback_type);
CREATE INDEX idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX idx_feedbacks_district ON feedbacks(district_name);

-- Verify all tables created
\dt

-- Exit
\q
```

---

## 🚀 Steps to Run the Project

### Step 1: Run Backend

Open a terminal and run:

```bash
cd backend
go mod tidy
go run main.go
```

**Expected output:** `Server starting on port 8082...`

### Step 2: Run Frontend

Open a **new terminal** and run:

```bash
cd frontend
npm install
npm start
```

**Expected output:** Browser opens at `http://localhost:3000`

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

Create this file with your credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_NAME=new_trip_planner

JWT_SECRET=your_secret_key_minimum_32_characters

GROQ_API_KEY=YOUR_GROQ_API_KEY
PORT=8082

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=YOUR_EMAIL@gmail.com
SMTP_PASSWORD=YOUR_APP_PASSWORD

ADMIN_EMAIL=admin@tripplanner.com
ADMIN_PASSWORD=Admin@123

OPENROUTE_API_KEY=YOUR_OPENROUTE_API_KEY
OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY
```

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:8082
```

---

## 🌐 Access the Application

| Portal | URL |
|--------|-----|
| **User/Agency** | http://localhost:3000 |
| **Admin Login** | http://localhost:3000/admin/login |

---

**Done!** Your AI Trip Planner is ready to use. 🎉
