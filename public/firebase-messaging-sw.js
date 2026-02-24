// Firebase Cloud Messaging Service Worker
// Этот файл обрабатывает background push уведомления

// Импортируем Firebase SDK для Service Workers
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Firebase конфигурация (копируется из .env при билде)
// В production среде эти значения будут подставлены автоматически
const firebaseConfig = {
  apiKey: "AIzaSyBZn2q3Db9WujSO0n_YlVUltWcabD3DrNk",
  authDomain: "sparify-4db02.firebaseapp.com",
  databaseURL: "https://sparify-4db02-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sparify-4db02",
  storageBucket: "sparify-4db02.firebasestorage.app",
  messagingSenderId: "32277809254",
  appId: "1:32277809254:web:3e57fa1a8ca85c878585a7",
  measurementId: "G-XDT3XQTXEV"
};

// Инициализация Firebase в Service Worker
firebase.initializeApp(firebaseConfig);

// Получение экземпляра messaging
const messaging = firebase.messaging();

// Обработка background сообщений
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Получено background сообщение:', payload);

  // Извлекаем данные из payload
  const notificationTitle = payload.notification?.title || 'Sparify';
  const notificationOptions = {
    body: payload.notification?.body || 'У вас новое уведомление',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: payload.data?.tag || 'sparify-notification',
    data: payload.data,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  // Показываем уведомление
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Клик по уведомлению:', event);

  event.notification.close();

  // Открываем приложение при клике
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если приложение уже открыто, фокусируемся на нём
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Если приложение не открыто, открываем новое окно
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Кэширование для offline работы
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker установлен');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker активирован');
  event.waitUntil(clients.claim());
});
