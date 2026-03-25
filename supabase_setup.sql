-- 1. Tabela profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  balance DECIMAL(12, 2) DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  nif TEXT,
  bank_details TEXT,
  bi_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Função para auto-confirmar novos usuários (Bypass de SMS/Email)
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  NEW.phone_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-confirmar na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- 3. Função para lidar com novos usuários (Perfil)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_phone TEXT;
BEGIN
  v_email := COALESCE(NEW.email, '');
  v_phone := NEW.phone;

  -- Se for um email virtual de telefone (ex: 244912345678@telefone.local)
  -- Extraímos o número para o campo phone e limpamos o campo email
  IF v_email LIKE '%@telefone.local' THEN
    v_phone := '+' || split_part(v_email, '@', 1);
    v_email := '';
  END IF;

  INSERT INTO public.profiles (id, email, is_admin, balance, phone)
  VALUES (
    NEW.id, 
    v_email, 
    (v_email = 'tchivembedelgado@gmail.com'),
    0,
    v_phone
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE profiles.email END,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    is_admin = (EXCLUDED.email = 'tchivembedelgado@gmail.com');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Garantir que o usuário atual seja Admin (caso já esteja registrado)
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'tchivembedelgado@gmail.com';

-- 5. Tabela rifas
CREATE TABLE IF NOT EXISTS rifas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL(12, 2) NOT NULL,
  total_numbers INTEGER NOT NULL,
  current_number INTEGER DEFAULT 1,
  sold_count INTEGER DEFAULT 0,
  main_prize_value DECIMAL(12, 2) DEFAULT 0,
  main_prize_type TEXT DEFAULT 'cash' CHECK (main_prize_type IN ('cash', 'physical')),
  main_prize_description TEXT,
  winner_id UUID REFERENCES auth.users(id),
  draw_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela premios_escondidos
CREATE TABLE IF NOT EXISTS premios_escondidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raffle_id UUID REFERENCES rifas(id) ON DELETE CASCADE,
  target_number INTEGER NOT NULL,
  prize_value DECIMAL(12, 2) DEFAULT 0,
  prize_type TEXT DEFAULT 'cash' CHECK (prize_type IN ('cash', 'physical')),
  description TEXT,
  UNIQUE(raffle_id, target_number)
);

-- 7. Tabela purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  raffle_id UUID REFERENCES rifas(id) ON DELETE CASCADE,
  assigned_number INTEGER NOT NULL,
  prize_won_amount DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Tabela winner_claims
CREATE TABLE IF NOT EXISTS winner_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  raffle_id UUID REFERENCES rifas(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  prize_description TEXT,
  prize_type TEXT,
  is_main_prize BOOLEAN DEFAULT false,
  full_name TEXT,
  phone TEXT,
  payment_info TEXT, -- IBAN ou Transferência
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Tabela depositos
CREATE TABLE IF NOT EXISTS depositos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Tabela withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('iban', 'express', 'unitel')),
  details TEXT NOT NULL, -- IBAN ou Número de Telefone
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Tabela support
CREATE TABLE IF NOT EXISTS support (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  message TEXT,
  response TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Função RPC: process_raffle_purchase (Versão Robusta com suporte a múltiplas compras)
CREATE OR REPLACE FUNCTION process_raffle_purchase(p_raffle_id UUID, p_user_id UUID, p_quantity INTEGER DEFAULT 1)
RETURNS JSON AS $$
DECLARE
  v_raffle_price DECIMAL(12, 2);
  v_user_balance DECIMAL(12, 2);
  v_current_number INTEGER;
  v_total_numbers INTEGER;
  v_assigned_numbers INTEGER[] := '{}';
  v_total_prize_value DECIMAL(12, 2) DEFAULT 0;
  v_prizes_won JSONB[] := '{}';
  v_has_won_prize BOOLEAN DEFAULT false;
  v_has_won_main_prize BOOLEAN DEFAULT false;
  v_main_prize_value DECIMAL(12, 2);
  v_main_prize_type TEXT;
  v_new_balance DECIMAL(12, 2);
  v_i INTEGER;
  v_temp_prize_value DECIMAL(12, 2);
  v_temp_prize_type TEXT;
  v_temp_prize_desc TEXT;
  v_purchase_id UUID;
BEGIN
  -- 1. Bloquear a linha da rifa e obter informações
  SELECT price, COALESCE(current_number, 1), total_numbers, main_prize_value, main_prize_type 
  INTO v_raffle_price, v_current_number, v_total_numbers, v_main_prize_value, v_main_prize_type
  FROM rifas WHERE id = p_raffle_id FOR UPDATE;
  
  IF v_raffle_price IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Rifa não encontrada.');
  END IF;

  -- 2. Verificar se há números suficientes disponíveis
  IF v_current_number + p_quantity - 1 > v_total_numbers THEN
    RETURN json_build_object('success', false, 'message', 'Números insuficientes disponíveis.');
  END IF;
  
  -- 3. Verificar saldo do usuário
  SELECT balance INTO v_user_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_user_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Perfil de utilizador não encontrado.');
  END IF;

  IF v_user_balance < (v_raffle_price * p_quantity) THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente para comprar ' || p_quantity || ' rifas.');
  END IF;
  
  -- 4. Loop para processar cada bilhete
  FOR v_i IN 0..(p_quantity - 1) LOOP
    v_assigned_numbers := array_append(v_assigned_numbers, v_current_number + v_i);
    
    -- Verificar prêmios instantâneos
    SELECT prize_value, prize_type, description INTO v_temp_prize_value, v_temp_prize_type, v_temp_prize_desc
    FROM premios_escondidos 
    WHERE raffle_id = p_raffle_id AND target_number = (v_current_number + v_i);
    
    -- Verificar prêmio principal (último número)
    IF (v_current_number + v_i) = v_total_numbers THEN
      v_has_won_main_prize := true;
      v_temp_prize_value := COALESCE(v_temp_prize_value, 0) + v_main_prize_value;
      
      -- Se o prêmio principal for físico, o claim deve ser físico
      IF v_main_prize_type = 'physical' THEN
         v_temp_prize_type := 'physical';
      ELSIF v_temp_prize_type IS NULL THEN
         v_temp_prize_type := 'cash';
      END IF;
      
      -- Use main_prize_description if available
      SELECT COALESCE(main_prize_description, 'Prémio Principal') INTO v_temp_prize_desc
      FROM rifas WHERE id = p_raffle_id;
      
      UPDATE rifas SET status = 'completed' WHERE id = p_raffle_id;
    END IF;
    
    IF v_temp_prize_value > 0 OR v_temp_prize_type = 'physical' THEN
      v_has_won_prize := true;
      
      -- Somar qualquer valor em dinheiro ao total a ser creditado no saldo
      -- (Mesmo que o prêmio seja físico, pode haver um componente em dinheiro)
      -- v_temp_prize_value já contém a soma de prêmios em dinheiro para este bilhete
      v_total_prize_value := v_total_prize_value + COALESCE(v_temp_prize_value, 0);
      
      v_prizes_won := array_append(v_prizes_won, jsonb_build_object(
        'number', v_current_number + v_i,
        'value', v_temp_prize_value,
        'type', v_temp_prize_type,
        'description', v_temp_prize_desc
      ));
    END IF;
    
    -- Registar a compra
    INSERT INTO purchases (user_id, raffle_id, assigned_number, prize_won_amount)
    VALUES (p_user_id, p_raffle_id, v_current_number + v_i, COALESCE(v_temp_prize_value, 0))
    RETURNING id INTO v_purchase_id;

    -- Se for prêmio físico ou prêmio principal, registar na tabela de claims para o ADM ver
    IF v_temp_prize_type = 'physical' OR v_has_won_main_prize THEN
       INSERT INTO winner_claims (user_id, raffle_id, purchase_id, prize_description, prize_type, is_main_prize, status)
       VALUES (p_user_id, p_raffle_id, v_purchase_id, v_temp_prize_desc, v_temp_prize_type, v_has_won_main_prize, 'pending');
    END IF;
    
    -- Resetar variáveis temporárias
    v_temp_prize_value := 0;
    v_temp_prize_type := NULL;
    v_temp_prize_desc := NULL;
  END LOOP;
  
  -- 5. Atualizar rifa e perfil
  UPDATE rifas SET 
    current_number = v_current_number + p_quantity, 
    sold_count = COALESCE(sold_count, 0) + p_quantity 
  WHERE id = p_raffle_id;
  
  UPDATE profiles SET balance = balance - (v_raffle_price * p_quantity) + v_total_prize_value 
  WHERE id = p_user_id;
  
  -- 6. Obter novo saldo
  SELECT balance INTO v_new_balance FROM profiles WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Compra realizada com sucesso!',
    'numbers', v_assigned_numbers,
    'won_prize', v_has_won_prize,
    'is_main_prize', v_has_won_main_prize,
    'total_prize_value', v_total_prize_value,
    'prizes_won', v_prizes_won,
    'new_balance', v_new_balance,
    'quantity', p_quantity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Função RPC increment_balance (para depósitos)
CREATE OR REPLACE FUNCTION increment_balance(p_user_id UUID, p_amount DECIMAL(12, 2))
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET balance = balance + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 14. Função RPC para processar aprovação de levantamento
CREATE OR REPLACE FUNCTION approve_withdrawal(p_withdrawal_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_amount DECIMAL(12, 2);
  v_status TEXT;
  v_user_balance DECIMAL(12, 2);
BEGIN
  -- 1. Obter dados do levantamento e bloquear a linha
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
  FROM withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  
  -- 2. Verificar se o levantamento existe e está pendente
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Levantamento não encontrado.');
  END IF;
  
  IF v_status <> 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Este levantamento já foi processado.');
  END IF;
  
  -- 3. Verificar saldo do usuário e bloquear perfil
  SELECT balance INTO v_user_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
  
  IF v_user_balance < v_amount THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente na conta do usuário.');
  END IF;
  
  -- 4. Deduzir saldo e atualizar status
  UPDATE profiles SET balance = balance - v_amount WHERE id = v_user_id;
  UPDATE withdrawals SET status = 'approved' WHERE id = p_withdrawal_id;
  
  RETURN json_build_object('success', true, 'message', 'Levantamento aprovado e saldo debitado.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Políticas de Segurança (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE premios_escondidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE support ENABLE ROW LEVEL SECURITY;
ALTER TABLE winner_claims ENABLE ROW LEVEL SECURITY;

-- Função robusta para verificar se é admin (consulta a tabela profiles)
-- SECURITY DEFINER faz com que a função ignore RLS ao consultar a tabela profiles
CREATE OR REPLACE FUNCTION is_admin_check()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar admin via JWT (evita recursão em políticas da tabela profiles)
CREATE OR REPLACE FUNCTION is_admin_jwt_check()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email' = 'tchivembedelgado@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles
DROP POLICY IF EXISTS "Profiles_Owner_Read" ON profiles;
DROP POLICY IF EXISTS "Profiles_Owner_Update" ON profiles;
DROP POLICY IF EXISTS "Profiles_Admin_Read" ON profiles;
DROP POLICY IF EXISTS "Profiles_Admin_Update" ON profiles;

CREATE POLICY "Profiles_Owner_Read" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles_Owner_Update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles_Admin_Read" ON profiles FOR SELECT USING (is_admin_jwt_check());
CREATE POLICY "Profiles_Admin_Update" ON profiles FOR UPDATE USING (is_admin_jwt_check());

-- Rifas
DROP POLICY IF EXISTS "Rifas_Public_Read" ON rifas;
DROP POLICY IF EXISTS "Rifas_Admin_All" ON rifas;

CREATE POLICY "Rifas_Public_Read" ON rifas FOR SELECT USING (true);
CREATE POLICY "Rifas_Admin_All" ON rifas FOR ALL USING (is_admin_check());

-- Instant Prizes
DROP POLICY IF EXISTS "Prizes_Admin_All" ON premios_escondidos;

CREATE POLICY "Prizes_Admin_All" ON premios_escondidos FOR ALL USING (is_admin_check());

-- Purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Admins can view all purchases" ON purchases;

CREATE POLICY "Users can view own purchases" ON purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all purchases" ON purchases FOR SELECT USING (is_admin_check());

-- Depositos
DROP POLICY IF EXISTS "Users can manage own depositos" ON depositos;
DROP POLICY IF EXISTS "Users can insert own depositos" ON depositos;
DROP POLICY IF EXISTS "Admins can manage all depositos" ON depositos;

CREATE POLICY "Users can manage own depositos" ON depositos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own depositos" ON depositos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all depositos" ON depositos FOR ALL USING (is_admin_check());

-- Withdrawals
DROP POLICY IF EXISTS "Withdrawals_Owner_Read" ON withdrawals;
DROP POLICY IF EXISTS "Withdrawals_Owner_Insert" ON withdrawals;
DROP POLICY IF EXISTS "Withdrawals_Admin_All" ON withdrawals;

CREATE POLICY "Withdrawals_Owner_Read" ON withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Withdrawals_Owner_Insert" ON withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Withdrawals_Admin_All" ON withdrawals FOR ALL USING (is_admin_check());

-- Support
DROP POLICY IF EXISTS "Users can manage own support" ON support;
DROP POLICY IF EXISTS "Users can insert own support" ON support;
DROP POLICY IF EXISTS "Admins can manage all support" ON support;

CREATE POLICY "Users can manage own support" ON support FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own support" ON support FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all support" ON support FOR ALL USING (is_admin_check());

-- Winner Claims
DROP POLICY IF EXISTS "Users can manage own claims" ON winner_claims;
DROP POLICY IF EXISTS "Users can insert own claims" ON winner_claims;
DROP POLICY IF EXISTS "Admins can manage all claims" ON winner_claims;

CREATE POLICY "Users can manage own claims" ON winner_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own claims" ON winner_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all claims" ON winner_claims FOR ALL USING (is_admin_check());

-- 16. Storage Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-rifas', 'fotos-rifas', true),
       ('comprovativos', 'comprovativos', true),
       ('bi-photos', 'bi-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas Storage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Admin All" ON storage.objects FOR ALL USING (is_admin_check());
CREATE POLICY "User Upload" ON storage.objects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
