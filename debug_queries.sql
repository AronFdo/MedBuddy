-- Debug Queries to identify profile verification issue
-- Run these in your Supabase SQL editor to understand the data structure

-- 1. Check all profiles in the database
SELECT id, name, user_id, profile_type, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- 2. Check profiles for a specific user (replace 'your-user-id' with actual user ID)
SELECT id, name, user_id, profile_type, created_at 
FROM profiles 
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;

-- 3. Check if there are any profiles with null user_id
SELECT id, name, user_id, profile_type, created_at 
FROM profiles 
WHERE user_id IS NULL;

-- 4. Check the structure of the profiles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 5. Check for any data type mismatches (if user_id is stored as text vs uuid)
SELECT id, name, user_id, 
       pg_typeof(user_id) as user_id_type,
       pg_typeof(id) as id_type
FROM profiles 
LIMIT 5;

-- 6. Check medications table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'medications' 
ORDER BY ordinal_position;

-- 7. Check appointments table structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;

-- 8. Check health_records table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'health_records' 
ORDER BY ordinal_position; 