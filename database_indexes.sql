-- Database Indexes for MedBuddy Performance Optimization
-- Run this file in your Supabase SQL Editor to improve query performance
-- Expected improvement: 75-95% reduction in query time for filtered queries

-- ============================================
-- PROFILES TABLE INDEXES
-- ============================================
-- Most queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);

-- ============================================
-- MEDICATIONS TABLE INDEXES
-- ============================================
-- Frequently queried by profile_id
CREATE INDEX IF NOT EXISTS idx_medications_profile_id ON medications(profile_id);
CREATE INDEX IF NOT EXISTS idx_medications_prescription_id ON medications(prescription_id);
CREATE INDEX IF NOT EXISTS idx_medications_medication_id ON medications(medication_id);

-- Composite index for common query pattern: profile_id + prescription_id
CREATE INDEX IF NOT EXISTS idx_medications_profile_prescription ON medications(profile_id, prescription_id);

-- ============================================
-- APPOINTMENTS TABLE INDEXES
-- ============================================
-- Frequently queried by profile_id and date
CREATE INDEX IF NOT EXISTS idx_appointments_profile_id ON appointments(profile_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_attended ON appointments(attended) WHERE attended = false;

-- Composite index for common query: profile_id + date (for sorting)
CREATE INDEX IF NOT EXISTS idx_appointments_profile_date ON appointments(profile_id, date DESC);

-- ============================================
-- HEALTH RECORDS TABLE INDEXES
-- ============================================
-- Frequently queried by profile_id and event_date
CREATE INDEX IF NOT EXISTS idx_health_records_profile_id ON health_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_health_records_event_date ON health_records(event_date DESC);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_health_records_profile_event_date ON health_records(profile_id, event_date DESC);

-- ============================================
-- MEDICATION LOGS TABLE INDEXES
-- ============================================
-- Frequently queried by profile_id and log_date
CREATE INDEX IF NOT EXISTS idx_medication_logs_profile_id ON medication_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_log_date ON medication_logs(log_date DESC);

-- Composite index for common query: profile_id + log_date (for date range queries)
CREATE INDEX IF NOT EXISTS idx_medication_logs_profile_date ON medication_logs(profile_id, log_date DESC);

-- Note: Partial index with CURRENT_DATE removed - it's not immutable.
-- The composite index above will efficiently handle date-filtered queries including today's logs.

-- ============================================
-- AI CONVERSATIONS TABLE INDEXES
-- ============================================
-- Frequently queried by profile_id and created_at
CREATE INDEX IF NOT EXISTS idx_ai_conversations_profile_id ON ai_conversations(profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- Composite index for common query: profile_id + created_at (for ordering)
CREATE INDEX IF NOT EXISTS idx_ai_conversations_profile_created ON ai_conversations(profile_id, created_at DESC);

-- ============================================
-- PRESCRIPTIONS TABLE INDEXES
-- ============================================
-- Frequently queried by profile_id
CREATE INDEX IF NOT EXISTS idx_prescriptions_profile_id ON prescriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_issued_date ON prescriptions(issued_date DESC);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify indexes were created:
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename, indexname;

-- Check index usage (run after some usage):
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;

