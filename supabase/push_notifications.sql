-- Push Notifications SQL Setup für Sparify
-- Führe dieses Script in der Supabase SQL Editor aus

-- 1. Push Subscriptions Tabelle erstellen
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS aktivieren
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- 2. Funktion zum Aufruf der Edge Function bei neuen Transaktionen
CREATE OR REPLACE FUNCTION notify_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  piggy_owner_id UUID;
  piggy_name TEXT;
BEGIN
  -- Hole den Owner der Piggy Bank
  SELECT user_id, name INTO piggy_owner_id, piggy_name
  FROM piggy_banks
  WHERE id = NEW.piggy_bank_id;

  -- Nur bei Einzahlungen benachrichtigen
  IF NEW.type = 'deposit' AND piggy_owner_id IS NOT NULL THEN
    -- Rufe die Edge Function auf (asynchron via pg_net)
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'user_id', piggy_owner_id,
        'title', 'Geld eingezahlt! 💰',
        'body', 'Es wurden ' || NEW.title || ' in ' || COALESCE(piggy_name, 'deine Sparbox') || ' eingezahlt.',
        'url', '/'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger erstellen (nur wenn pg_net Extension verfügbar ist)
-- HINWEIS: Kommentiere dies aus, wenn pg_net nicht aktiviert ist
-- Du musst pg_net in Supabase Dashboard aktivieren: Database > Extensions > pg_net

-- DROP TRIGGER IF EXISTS on_transaction_insert ON transactions;
-- CREATE TRIGGER on_transaction_insert
--   AFTER INSERT ON transactions
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_on_transaction();

-- ALTERNATIVE: Webhook statt Trigger
-- Gehe zu Supabase Dashboard > Database > Webhooks
-- Erstelle einen neuen Webhook:
-- - Name: notify_on_deposit
-- - Table: transactions
-- - Events: INSERT
-- - HTTP Method: POST
-- - URL: https://[YOUR-PROJECT].supabase.co/functions/v1/send-push
-- - Headers: Authorization: Bearer [SERVICE_ROLE_KEY]
