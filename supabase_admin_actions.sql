-- Função para deduzir saldo do usuário (Apenas Admin)
CREATE OR REPLACE FUNCTION deduct_balance(p_user_id UUID, p_amount DECIMAL, p_reason TEXT)
RETURNS JSON AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  -- 1. Verificar se o chamador é admin
  IF NOT is_admin_check() THEN
    RETURN json_build_object('success', false, 'message', 'Apenas administradores podem realizar esta ação.');
  END IF;

  -- 2. Obter saldo atual
  SELECT balance INTO v_current_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Usuário não encontrado.');
  END IF;

  -- 3. Deduzir saldo
  UPDATE profiles SET balance = balance - p_amount WHERE id = p_user_id;

  -- 4. Registrar no histórico de transações (valor negativo)
  INSERT INTO wallet_history (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'withdrawal', 'Dedução Administrativa: ' || p_reason);

  -- 5. Inserir mensagem no chat informando a fraude
  INSERT INTO chat_messages (user_id, sender_id, content, media_type)
  VALUES (p_user_id, auth.uid(), 'Dinheiro removido por tentativa de fraude', 'text');

  RETURN json_build_object('success', true, 'message', 'Saldo deduzido com sucesso e usuário notificado.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
