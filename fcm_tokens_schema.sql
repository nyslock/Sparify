-- SQL для создания таблицы fcm_tokens
-- Выполните это в Supabase SQL Editor

-- Удаляем старую таблицу если есть
DROP TABLE IF EXISTS fcm_tokens CASCADE;

-- Создаем таблицу для FCM токенов
-- Один пользователь может иметь несколько токенов (разные браузеры/устройства)
CREATE TABLE fcm_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- Уникальный индекс для уникальной комбинации user_id + token
-- Это гарантирует что один и тот же токен не будет добавлен дважды
CREATE UNIQUE INDEX idx_fcm_tokens_user_token ON fcm_tokens(user_id, token);

-- Row Level Security (RLS)
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать только свои токены
CREATE POLICY "Users can read their own FCM tokens"
  ON fcm_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователи могут удалять только свои токены
CREATE POLICY "Users can delete their own FCM tokens"
  ON fcm_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Политика: пользователи могут вставлять только свои токены
CREATE POLICY "Users can insert their own FCM tokens"
  ON fcm_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут обновлять только свои токены
CREATE POLICY "Users can update their own FCM tokens"
  ON fcm_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика для service role (для Edge Functions и Supabase functions)
CREATE POLICY "Service role can read all FCM tokens"
  ON fcm_tokens
  FOR SELECT
  TO service_role
  USING (true);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_fcm_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at при UPDATE
CREATE TRIGGER update_fcm_tokens_updated_at_trigger
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_fcm_tokens_updated_at();

