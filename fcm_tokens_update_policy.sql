-- Add UPDATE policy for fcm_tokens table
-- Run this in Supabase SQL Editor

-- Add policy: users can update only their own tokens
CREATE POLICY "Users can update their own FCM tokens"
  ON fcm_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
