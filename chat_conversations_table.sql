-- Create chat_conversations table for storing chat history
CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by profile_id
CREATE INDEX IF NOT EXISTS idx_chat_conversations_profile_id ON chat_conversations(profile_id);

-- Create index for faster queries by updated_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own conversations
CREATE POLICY "Users can view their own conversations" ON chat_conversations
    FOR SELECT USING (
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Policy to allow users to insert their own conversations
CREATE POLICY "Users can insert their own conversations" ON chat_conversations
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Policy to allow users to update their own conversations
CREATE POLICY "Users can update their own conversations" ON chat_conversations
    FOR UPDATE USING (
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Policy to allow users to delete their own conversations
CREATE POLICY "Users can delete their own conversations" ON chat_conversations
    FOR DELETE USING (
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    ); 