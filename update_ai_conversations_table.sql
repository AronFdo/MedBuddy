-- Update ai_conversations table to use profile_id instead of user_id
-- This migration adds profile_id column and updates the table structure

-- Add profile_id column
ALTER TABLE ai_conversations ADD COLUMN profile_id UUID;

-- Add foreign key constraint to profiles table
ALTER TABLE ai_conversations 
ADD CONSTRAINT fk_ai_conversations_profile_id 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create index for faster queries by profile_id
CREATE INDEX IF NOT EXISTS idx_ai_conversations_profile_id ON ai_conversations(profile_id);

-- Update RLS policies to use profile_id
DROP POLICY IF EXISTS "Service role can read ai_conversations by user_id" ON ai_conversations;
DROP POLICY IF EXISTS "Service role can insert ai_conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Service role can delete ai_conversations" ON ai_conversations;

-- Create new policies using profile_id
CREATE POLICY "Service role can read ai_conversations by profile_id" ON ai_conversations
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can insert ai_conversations" ON ai_conversations
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can delete ai_conversations" ON ai_conversations
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Note: After running this migration, you may want to migrate existing data
-- from user_id to profile_id if you have existing conversations
-- You can do this by mapping user_id to the corresponding profile_id 