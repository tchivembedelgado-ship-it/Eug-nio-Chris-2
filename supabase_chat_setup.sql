
-- 1. Garantir que as colunas existam na tabela chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_by UUID[] DEFAULT '{}';

-- Atualizar linhas existentes para evitar valores nulos
UPDATE chat_messages SET deleted_by = '{}' WHERE deleted_by IS NULL;
UPDATE chat_messages SET is_edited = FALSE WHERE is_edited IS NULL;
UPDATE chat_messages SET deleted_for_everyone = FALSE WHERE deleted_for_everyone IS NULL;

-- 2. Tabela de Histórico de Carteira (Para transparência)
CREATE TABLE IF NOT EXISTS wallet_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'prize', 'gift', 'purchase')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_history;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 4. Políticas de Segurança (RLS)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_history ENABLE ROW LEVEL SECURITY;

-- Políticas chat_messages
DROP POLICY IF EXISTS "Users can view own chat" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can manage all chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON chat_messages;

CREATE POLICY "Users can view own chat" ON chat_messages FOR SELECT USING (
  (auth.uid() = user_id OR is_admin_check()) AND NOT (auth.uid() = ANY(deleted_by))
);
CREATE POLICY "Users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON chat_messages FOR UPDATE USING (auth.uid() = sender_id OR is_admin_check());
CREATE POLICY "Admins can manage all chats" ON chat_messages FOR ALL USING (is_admin_check());

-- Políticas wallet_history
DROP POLICY IF EXISTS "Users can view own history" ON wallet_history;
DROP POLICY IF EXISTS "Admins can view all history" ON wallet_history;

CREATE POLICY "Users can view own history" ON wallet_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all history" ON wallet_history FOR SELECT USING (is_admin_check());

-- 5. Função RPC para resgatar presente
CREATE OR REPLACE FUNCTION claim_chat_gift(p_message_id UUID)
RETURNS JSON AS $$
DECLARE
  v_message RECORD;
  v_gift_type TEXT;
  v_gift_value DECIMAL(12, 2);
  v_gift_desc TEXT;
  v_gift_status TEXT;
  v_new_balance DECIMAL(12, 2);
BEGIN
  -- 1. Obter a mensagem e bloquear
  SELECT * INTO v_message FROM chat_messages WHERE id = p_message_id FOR UPDATE;
  
  IF v_message IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Mensagem não encontrada.');
  END IF;
  
  -- 2. Verificar se é um presente e se pertence ao usuário
  IF v_message.media_type <> 'gift' THEN
    RETURN json_build_object('success', false, 'message', 'Esta mensagem não contém um presente.');
  END IF;
  
  IF v_message.user_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'message', 'Você não tem permissão para abrir este presente.');
  END IF;
  
  -- 3. Extrair dados do presente
  v_gift_type := v_message.gift_data->>'type';
  v_gift_value := (v_message.gift_data->>'value')::DECIMAL;
  v_gift_desc := v_message.gift_data->>'description';
  v_gift_status := v_message.gift_data->>'status';
  
  IF v_gift_status = 'claimed' THEN
    RETURN json_build_object('success', false, 'message', 'Este presente já foi resgatado.');
  END IF;
  
  -- 4. Processar resgate
  IF v_gift_type = 'cash' THEN
    -- Aumentar saldo e obter novo valor
    UPDATE profiles SET balance = balance + v_gift_value WHERE id = auth.uid() RETURNING balance INTO v_new_balance;
    
    -- Registrar no histórico
    INSERT INTO wallet_history (user_id, amount, type, description)
    VALUES (auth.uid(), v_gift_value, 'gift', 'Presente do ADM: ' || v_gift_desc);
    
  ELSIF v_gift_type = 'physical' THEN
    -- Registrar em winner_claims (como os prêmios da rifa)
    INSERT INTO winner_claims (user_id, prize_description, prize_type, status)
    VALUES (auth.uid(), 'Presente do ADM: ' || v_gift_desc, 'physical', 'pending');
    
    -- Registrar no histórico (valor 0 para material)
    INSERT INTO wallet_history (user_id, amount, type, description)
    VALUES (auth.uid(), 0, 'gift', 'Presente Material do ADM: ' || v_gift_desc);
  END IF;
  
  -- 5. Atualizar status da mensagem
  UPDATE chat_messages 
  SET gift_data = jsonb_set(gift_data, '{status}', '"claimed"')
  WHERE id = p_message_id;
  
  RETURN json_build_object('success', true, 'message', 'Presente resgatado com sucesso!', 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função RPC para deletar mensagem para si mesmo
CREATE OR REPLACE FUNCTION delete_message_for_me(p_message_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_messages 
  SET deleted_by = array_append(deleted_by, auth.uid())
  WHERE id = p_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Bucket de Storage para Chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Chat Media Access" ON storage.objects;
CREATE POLICY "Chat Media Access" ON storage.objects FOR ALL USING (auth.uid() IS NOT NULL);
