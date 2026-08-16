-- Migration script to add buyer allowance and multiple purchases features

-- 1. Add buyer_allowance to game_state
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS buyer_allowance NUMERIC DEFAULT 0;

-- 2. Add balance to game_profiles
ALTER TABLE game_profiles ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;

-- 3. Remove unique constraint from game_purchases
ALTER TABLE game_purchases DROP CONSTRAINT IF EXISTS game_purchases_buyer_id_key;
