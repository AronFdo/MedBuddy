-- Debug script to check user profiles and identify the mismatch
-- Run this in your Supabase SQL editor
-- Based on the actual profiles table structure

-- 1. Check all profiles and their user IDs
SELECT 
  id, 
  name, 
  user_id, 
  profile_type,
  age,
  gender,
  email,
  updated_at,
  pg_typeof(user_id) as user_id_type
FROM profiles 
ORDER BY updated_at DESC;

-- 2. Check specifically for the user from the error
SELECT 
  id, 
  name, 
  user_id, 
  profile_type,
  age,
  gender,
  email,
  updated_at,
  pg_typeof(user_id) as user_id_type
FROM profiles 
WHERE user_id = 'c7c2f49c-d501-4815-824c-031906416de8';

-- 3. Check if the specific profile exists
SELECT 
  id, 
  name, 
  user_id, 
  profile_type,
  age,
  gender,
  email,
  updated_at,
  pg_typeof(user_id) as user_id_type
FROM profiles 
WHERE id = '108a1311-6202-475c-b213-3c416ecdb1cd';

-- 4. Check for any profiles with similar user IDs (case variations)
SELECT 
  id, 
  name, 
  user_id, 
  profile_type,
  age,
  gender
FROM profiles 
WHERE LOWER(user_id::text) = LOWER('c7c2f49c-d501-4815-824c-031906416de8');

-- 5. Check if there are any profiles with null or empty user_id
SELECT 
  id, 
  name, 
  user_id, 
  profile_type,
  age,
  gender
FROM profiles 
WHERE user_id IS NULL;

-- 6. Check the auth.users table for this user
SELECT 
  id, 
  email, 
  created_at,
  pg_typeof(id) as id_type
FROM auth.users 
WHERE id = 'c7c2f49c-d501-4815-824c-031906416de8';

-- 7. Check the foreign key relationship
SELECT 
  p.id as profile_id,
  p.name as profile_name,
  p.user_id as profile_user_id,
  u.id as auth_user_id,
  u.email as auth_user_email
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.user_id = 'c7c2f49c-d501-4815-824c-031906416de8'; 