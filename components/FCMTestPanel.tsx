import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { initializeFirebase, getFCMToken, VAPID_KEY } from '../lib/firebase';

export const FCMTestPanel: React.FC<{ userId?: string; onClose?: () => void }> = ({ userId, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
    console.log(`[FCM Test] ${message}`);
  };

  const checkEnvironment = () => {
    addLog('=== Проверка окружения ===');
    addLog(`User ID: ${userId || 'НЕ АВТОРИЗОВАН'}`);
    addLog(`VAPID Key: ${VAPID_KEY ? VAPID_KEY.substring(0, 20) + '...' : 'НЕ НАСТРОЕН'}`);
    addLog(`Notification API: ${('Notification' in window) ? 'Поддерживается' : 'НЕ поддерживается'}`);
    addLog(`Service Worker API: ${('serviceWorker' in navigator) ? 'Поддерживается' : 'НЕ поддерживается'}`);
    addLog(`Push Manager: ${('PushManager' in window) ? 'Поддерживается' : 'НЕ поддерживается'}`);
    addLog(`Текущее разрешение: ${Notification.permission}`);
  };

  const testRequestPermission = async () => {
    addLog('=== Запрос разрешения на уведомления ===');
    try {
      const permission = await Notification.requestPermission();
      addLog(`Результат: ${permission}`);
    } catch (error: any) {
      addLog(`❌ Ошибка: ${error.message}`);
    }
  };

  const testFirebaseInit = async () => {
    addLog('=== Инициализация Firebase ===');
    try {
      initializeFirebase();
      addLog('✅ Firebase инициализирован');
    } catch (error: any) {
      addLog(`❌ Ошибка: ${error.message}`);
    }
  };

  const testGetToken = async (): Promise<string | null> => {
    if (!userId) {
      addLog('❌ Пользователь не авторизован');
      return null;
    }

    addLog('=== Получение FCM токена ===');
    setLoading(true);
    try {
      const fcmToken = await getFCMToken();
      if (fcmToken) {
        addLog(`✅ Токен получен: ${fcmToken.substring(0, 30)}...`);
        setToken(fcmToken); // Сохраняем в state для использования в других функциях
        return fcmToken; // Возвращаем токен
      } else {
        addLog('❌ Токен не получен');
        setToken(null);
        return null;
      }
    } catch (error: any) {
      addLog(`❌ Ошибка: ${error.message}`);
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const testCheckTableStructure = async () => {
    addLog('=== Проверка структуры таблицы fcm_tokens ===');
    setLoading(true);
    try {
      // Пробуем получить одну запись чтобы увидеть структуру
      const { data, error } = await supabase
        .from('fcm_tokens')
        .select('*')
        .limit(1);

      if (error) {
        addLog(`❌ Ошибка: ${error.message}`);
      } else {
        if (data && data.length > 0) {
          addLog(`Структура таблицы: ${Object.keys(data[0]).join(', ')}`);
        } else {
          addLog('Таблица пуста, невозможно определить структуру');
          addLog('Попробуем вставить тестовую запись...');
        }
      }
    } catch (error: any) {
      addLog(`❌ Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSaveToken = async (tokenToSave: string | null) => {
    addLog('[testSaveToken] Начало');
    addLog(`[testSaveToken] userId: ${userId}`);
    addLog(`[testSaveToken] token: ${tokenToSave ? tokenToSave.substring(0, 30) + '...' : 'undefined'}`);
    
    if (!userId || !tokenToSave) {
      addLog('❌ Нет user ID или токена');
      return;
    }

    addLog('=== Сохранение токена в Supabase ===');
    addLog(`Сохраняем: user_id=${userId}, token=${tokenToSave.substring(0, 30)}...`);
    setLoading(true);
    try {
      // Проверяем есть ли уже такой токен
      addLog('[testSaveToken] Проверяем есть ли токен в базе...');
      const { data: existingToken, error: checkError } = await supabase
        .from('fcm_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token', tokenToSave)
        .maybeSingle();

      if (checkError) {
        addLog(`⚠️ Ошибка при проверке: ${checkError.message}`);
      } else if (existingToken) {
        addLog(`✅ Токен уже существует в базе (id: ${existingToken.id})`);
        return;
      }

      // Добавляем новый токен
      addLog('[testSaveToken] Вставляем новый токен...');
      const { data, error } = await supabase
        .from('fcm_tokens')
        .insert([
          {
            user_id: userId,
            token: tokenToSave,
          }
        ])
        .select();

      addLog(`[testSaveToken] Ответ получен. Error: ${error ? 'да' : 'нет'}, Data: ${data ? data.length + ' записей' : 'null'}`);

      if (error) {
        addLog(`❌ Ошибка Supabase: ${error.message}`);
        addLog(`Code: ${error.code}`);
        addLog(`Детали: ${JSON.stringify(error)}`);
      } else {
        addLog(`✅ Токен сохранен в Supabase`);
        if (data && data.length > 0) {
          addLog(`Структура записи: ${Object.keys(data[0]).join(', ')}`);
          addLog(`Данные: ${JSON.stringify(data[0])}`);
        } else {
          addLog('⚠️ Нет возвращённых данных (select может быть отключен)');
        }
      }
    } catch (error: any) {
      addLog(`❌ Исключение: ${error.message}`);
      addLog(`Stack: ${error.stack}`);
    } finally {
      setLoading(false);
    }
  };

  const testCheckTokens = async () => {
    if (!userId) {
      addLog('❌ Пользователь не авторизован');
      return;
    }

    addLog('=== Проверка токенов в базе ===');
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('fcm_tokens')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (error) {
        addLog(`❌ Ошибка: ${error.message}`);
        addLog(`Code: ${error.code}`);
      } else {
        addLog(`Найдено токенов: ${count || 0}`);
        if (data && data.length > 0) {
          addLog(`Структура записей: ${Object.keys(data[0]).join(', ')}`);
          data.forEach((t, i) => {
            const fields = Object.keys(t).map(key => `${key}: ${typeof t[key] === 'string' && t[key].length > 30 ? t[key].substring(0, 30) + '...' : t[key]}`).join(', ');
            addLog(`Запись ${i + 1}: ${fields}`);
          });
        }
      }
    } catch (error: any) {
      addLog(`❌ Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runFullTest = async () => {
    setLogs([]);
    addLog('🚀 Запуск полного теста...');
    
    checkEnvironment();
    await new Promise(r => setTimeout(r, 800));
    
    await testCheckTableStructure();
    await new Promise(r => setTimeout(r, 800));
    
    await testFirebaseInit();
    await new Promise(r => setTimeout(r, 800));
    
    await testRequestPermission();
    await new Promise(r => setTimeout(r, 800));
    
    addLog('\n📥 Получаем токен...');
    const fetchedToken = await testGetToken(); // ПОЛУЧАЕМ ТОКЕН И СОХРАНЯЕМ В ПЕРЕМЕННУЮ
    await new Promise(r => setTimeout(r, 1000));
    
    addLog('\n💾 Сохраняем токен...');
    if (fetchedToken) {
      addLog(`✅ Token готов к сохранению: ${fetchedToken.substring(0, 30)}...`);
      await testSaveToken(fetchedToken); // ПЕРЕДАЁМ ТОКЕН ЯВНО
    } else {
      addLog('❌ КРИТИЧЕСКАЯ ОШИБКА: Так и не получили токен!');
    }
    await new Promise(r => setTimeout(r, 800));
    
    addLog('\n🔍 Проверяем базу...');
    await testCheckTokens();
    
    addLog('\n✨ Тест завершён!');
  };

  useEffect(() => {
    checkEnvironment();
  }, [userId]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">🔔 FCM Test Panel</h2>
            <p className="text-sm text-slate-500 mt-1">Тестирование Firebase Cloud Messaging</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={24} className="text-slate-400" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-3 border-b border-slate-200">
          <button
            onClick={runFullTest}
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50"
          >
            ▶️ Полный тест
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={checkEnvironment} className="py-2 bg-slate-100 rounded-lg text-sm font-bold">
              Проверить окружение
            </button>
            <button onClick={testCheckTableStructure} disabled={loading} className="py-2 bg-slate-100 rounded-lg text-sm font-bold disabled:opacity-50">
              Структура таблицы
            </button>
            <button onClick={testRequestPermission} className="py-2 bg-slate-100 rounded-lg text-sm font-bold">
              Запросить разрешение
            </button>
            <button onClick={testGetToken} disabled={loading} className="py-2 bg-slate-100 rounded-lg text-sm font-bold disabled:opacity-50">
              Получить токен
            </button>
            <button onClick={testSaveToken} disabled={loading || !token} className="py-2 bg-slate-100 rounded-lg text-sm font-bold disabled:opacity-50">
              Сохранить токен
            </button>
            <button onClick={testCheckTokens} disabled={loading} className="py-2 bg-slate-100 rounded-lg text-sm font-bold disabled:opacity-50">
              Проверить БД
            </button>
            <button onClick={() => setLogs([])} className="py-2 bg-red-50 text-red-500 rounded-lg text-sm font-bold">
              Очистить логи
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-green-400 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-slate-500">Логи появятся здесь...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
