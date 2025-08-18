-- RLS Policies for Service Role Access
-- These policies allow the service role to read data from protected tables

-- Enable RLS on medications table if not already enabled
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to read medications by profile_id
CREATE POLICY "Service role can read medications by profile_id" ON medications
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Enable RLS on appointments table if not already enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to read appointments by profile_id
CREATE POLICY "Service role can read appointments by profile_id" ON appointments
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Enable RLS on ai_conversations table if not already enabled
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to read ai_conversations by user_id
CREATE POLICY "Service role can read ai_conversations by user_id" ON ai_conversations
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        user_id = auth.uid()
    );

-- Policy to allow service role to insert ai_conversations
CREATE POLICY "Service role can insert ai_conversations" ON ai_conversations
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        user_id = auth.uid()
    );

-- Policy to allow service role to delete ai_conversations
CREATE POLICY "Service role can delete ai_conversations" ON ai_conversations
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        user_id = auth.uid()
    );

-- Optional: If you want to allow service role to read health_records as well
-- Enable RLS on health_records table if not already enabled
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to read health_records by profile_id
CREATE POLICY "Service role can read health_records by profile_id" ON health_records
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    ); 