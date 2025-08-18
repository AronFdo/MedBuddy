-- Quick database check for the profile issue
-- Run these queries in your Supabase SQL editor

-- 1. Check if the profiles table exists and has data
SELECT COUNT(*) as total_profiles FROM profiles;

-- 2. Check all profiles with their user IDs
SELECT id, name, user_id, profile_type, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- 3. Check if there are any profiles for the specific user from the error
SELECT id, name, user_id, profile_type, created_at 
FROM profiles 
WHERE user_id = 'c7c2f49c-d501-4815-824c-031906416de8';

-- 4. Check if the specific profile ID exists anywhere
SELECT id, name, user_id, profile_type, created_at 
FROM profiles 
WHERE id = '108a1311-6202-475c-b213-3c416ecdb1cd';

-- 5. Check the auth.users table to see if the user exists
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'c7c2f49c-d501-4815-824c-031906416de8'; 