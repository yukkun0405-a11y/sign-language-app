const CACHE = 'jsl-v1';
const ASSETS = [
  './index.html',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=IBM+Plex+Mono:wght@400;600&display=swap',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/dist/tf.min.js',
  'https://unpkg.com/@mediapipe/hands@0.4.1646424915/hands.js'
];

// Install: cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache HTML immediately; external libs best-effort
      cache.add('./index.html');
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for assets, network-first for Firebase/API
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always go to network for Firebase and Anthropic API
  if (url.includes('firebaseio.com') ||
      url.includes('googleapis.com/google.firestore') ||
      url.includes('anthropic.com') ||
      url.includes('identitytoolkit')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
