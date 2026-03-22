# Supabase Database Schema

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  balance DECIMAL(12, 2) DEFAULT 0.00,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Rifas table
CREATE TABLE rifas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL(12, 2) NOT NULL,
  total_numbers INTEGER NOT NULL,
  sold_count INTEGER DEFAULT 0,
  draw_date TIMESTAMP WITH TIME ZONE,
  prize_description TEXT,
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Hidden Prizes table
CREATE TABLE hidden_prizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id UUID REFERENCES rifas(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  prize_amount DECIMAL(12, 2) NOT NULL,
  won BOOLEAN DEFAULT false,
  winner_id UUID REFERENCES profiles(id),
  UNIQUE(raffle_id, number)
);

-- Numbers/Participations table
CREATE TABLE participations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id UUID REFERENCES rifas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  is_hidden_winner BOOLEAN DEFAULT false,
  hidden_prize_amount DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(raffle_id, number)
);

-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  type TEXT NOT NULL, -- deposit, withdrawal, purchase
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Announcements table
CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Support table
CREATE TABLE support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  reply TEXT,
  status TEXT DEFAULT 'open', -- open, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE rifas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active rifas" ON rifas FOR SELECT USING (true);
CREATE POLICY "Admins can manage rifas" ON rifas ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own participations" ON participations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all participations" ON participations FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Function to buy a number (Atomic)
CREATE OR REPLACE FUNCTION buy_raffle_number(p_raffle_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_next_number INTEGER;
  v_price DECIMAL(12, 2);
  v_balance DECIMAL(12, 2);
  v_hidden_prize DECIMAL(12, 2) := 0;
  v_hidden_prize_id UUID;
BEGIN
  -- Get raffle price and current sold count
  SELECT price, sold_count + 1 INTO v_price, v_next_number FROM rifas WHERE id = p_raffle_id FOR UPDATE;
  
  -- Check if raffle is full
  IF v_next_number > (SELECT total_numbers FROM rifas WHERE id = p_raffle_id) THEN
    RETURN json_build_object('success', false, 'message', 'Rifa esgotada');
  END IF;

  -- Check user balance
  SELECT balance INTO v_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance < v_price THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente');
  END IF;

  -- Check for hidden prize
  SELECT prize_amount, id INTO v_hidden_prize, v_hidden_prize_id 
  FROM hidden_prizes 
  WHERE raffle_id = p_raffle_id AND number = v_next_number AND won = false;

  -- Deduct balance
  UPDATE profiles SET balance = balance - v_price WHERE id = p_user_id;
  
  -- If hidden prize, add to balance
  IF v_hidden_prize > 0 THEN
    UPDATE profiles SET balance = balance + v_hidden_prize WHERE id = p_user_id;
    UPDATE hidden_prizes SET won = true, winner_id = p_user_id WHERE id = v_hidden_prize_id;
  END IF;

  -- Record participation
  INSERT INTO participations (raffle_id, user_id, number, is_hidden_winner, hidden_prize_amount)
  VALUES (p_raffle_id, p_user_id, v_next_number, v_hidden_prize > 0, v_hidden_prize);

  -- Update raffle sold count
  UPDATE rifas SET sold_count = v_next_number WHERE id = p_raffle_id;

  RETURN json_build_object(
    'success', true, 
    'number', v_next_number, 
    'won_hidden', v_hidden_prize > 0, 
    'prize_amount', v_hidden_prize
  );
END;
$$ LANGUAGE plpgsql;
