-- Migration: Add locations and photos columns to travel_packages table
-- This script assumes PostgreSQL
ALTER TABLE travel_packages
  ADD COLUMN IF NOT EXISTS locations TEXT[],
  ADD COLUMN IF NOT EXISTS photos TEXT[];

