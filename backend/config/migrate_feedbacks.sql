-- Create feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
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

-- Add district_name column if table already exists
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS district_name VARCHAR(100);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_agency_id ON feedbacks(agency_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_district ON feedbacks(district_name);

