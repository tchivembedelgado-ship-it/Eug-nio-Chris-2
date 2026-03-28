-- Função para notificar novas mensagens de chat
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_recipient_id UUID;
  v_title TEXT;
  v_link TEXT;
BEGIN
  -- Obter nome do remetente
  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;
  
  -- Determinar destinatário
  -- Se o remetente for admin, notifica o usuário do chat
  -- Se o remetente for o usuário, notifica o admin
  
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.sender_id AND is_admin = true) THEN
    v_recipient_id := NEW.user_id; -- Notifica o usuário
    v_title := 'Nova mensagem do Suporte';
    v_link := '/suporte';
  ELSE
    -- Remetente é usuário, notifica o primeiro admin encontrado
    SELECT id INTO v_recipient_id FROM profiles WHERE is_admin = true LIMIT 1;
    v_title := 'Nova mensagem de ' || COALESCE(v_sender_name, 'Usuário');
    v_link := '/admin/suporte';
  END IF;

  -- Inserir notificação se o destinatário for válido e não for o próprio remetente
  IF v_recipient_id IS NOT NULL AND v_recipient_id <> NEW.sender_id THEN
    INSERT INTO notifications (user_id, tipo, titulo, mensagem, link)
    VALUES (
      v_recipient_id,
      'chat',
      v_title,
      CASE 
        WHEN NEW.media_type = 'text' THEN LEFT(NEW.content, 50)
        WHEN NEW.media_type = 'image' THEN '📷 Enviou uma imagem'
        WHEN NEW.media_type = 'video' THEN '🎥 Enviou um vídeo'
        WHEN NEW.media_type = 'audio' THEN '🎤 Enviou um áudio'
        WHEN NEW.media_type = 'gift' THEN '🎁 Enviou um presente!'
        ELSE 'Nova mensagem'
      END,
      v_link
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para disparar a notificação
DROP TRIGGER IF EXISTS on_chat_message_notify ON chat_messages;
CREATE TRIGGER on_chat_message_notify
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION notify_chat_message();
