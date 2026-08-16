-- Drop existing tables if re-running (be careful in production)
-- DROP TABLE IF EXISTS game_purchases;
-- DROP TABLE IF EXISTS game_products;
-- DROP TABLE IF EXISTS game_profiles;
-- DROP TABLE IF EXISTS game_state;
-- DROP TABLE IF EXISTS users;

-- 0. Users Table (Public mirror for auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Trigger to create a user entry automatically on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Unknown User'), 
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TABLE game_state (
  id INT PRIMARY KEY DEFAULT 1,
  marketplace_open BOOLEAN DEFAULT false,
  results_revealed BOOLEAN DEFAULT false,
  buyer_allowance NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert the single row for game state
INSERT INTO game_state (id, marketplace_open) VALUES (1, false) ON CONFLICT (id) DO NOTHING;

-- 2. Game Profiles Table (Roles & Purchase Tracking)
CREATE TABLE game_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin', 'seller', 'buyer')),
  has_purchased BOOLEAN DEFAULT false,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Game Products Table (Sellers' Products)
CREATE TABLE game_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES game_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'on_sale')),
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(seller_id) -- One product per seller
);

-- 4. Game Purchases Table (Tracking who bought what)
CREATE TABLE game_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES game_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES game_products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Realtime for all game tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE game_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE game_products;
ALTER PUBLICATION supabase_realtime ADD TABLE game_purchases;

-- Trigger to automatically create a game_profile when a user logs into the game
-- Note: Instead of a trigger, we can just upsert the profile in the app logic or via an RPC.
-- Since the users table already exists, we will insert them into game_profiles upon their first login to the Game Arena.

-- RLS (Row Level Security) - For this app, we will use the Service Role Key for API routes
-- and explicit queries, but let's enable RLS and just allow reads for authenticated users.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_purchases ENABLE ROW LEVEL SECURITY;

-- Allow public read for everything so the leaderboard works for unauthenticated guests!
CREATE POLICY "Allow public read for users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow self update for users" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow public read for game_state" ON game_state FOR SELECT USING (true);
CREATE POLICY "Allow public read for game_profiles" ON game_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read for game_products" ON game_products FOR SELECT USING (true);
CREATE POLICY "Allow public read for game_purchases" ON game_purchases FOR SELECT USING (true);

-- We'll handle inserts/updates securely via Next.js API Routes using the Service Role Key.
